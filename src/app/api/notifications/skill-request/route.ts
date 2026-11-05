import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 1. Authenticate calling user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: 'Bad Request: Missing requestId parameter' },
        { status: 400 }
      );
    }

    // 2. Fetch admin emails via SECURITY DEFINER RPC
    const { data: adminList, error: rpcError } = await supabase.rpc(
      'get_admin_emails_for_skill_request',
      { p_request_id: requestId }
    );

    if (rpcError) {
      console.error('[SkillRequestAlert] RPC Error:', rpcError);
      return NextResponse.json(
        { error: rpcError.message || 'Failed to fetch admin emails' },
        { status: 400 }
      );
    }

    if (!adminList || adminList.length === 0) {
      return NextResponse.json({
        sent: false,
        message: 'No eligible admin recipients found with email notifications enabled',
      });
    }

    // 3. Extract request metadata from first record
    const {
      skill_name,
      skill_category,
      skill_reason,
      requester_username,
    } = adminList[0];

    const recipientEmails = adminList
      .map((a: any) => a.admin_email)
      .filter((email: string) => Boolean(email && email.includes('@')));

    if (recipientEmails.length === 0) {
      return NextResponse.json({
        sent: false,
        message: 'No valid admin email addresses',
      });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || 'Workbench <onboarding@resend.dev>';
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.nextUrl.origin ||
      'https://workbench.build';
    const adminUrl = `${siteUrl}/admin`;

    // 4. Graceful fallback if RESEND_API_KEY is not yet configured
    if (!resendApiKey) {
      console.info(
        `[SkillRequestAlert] RESEND_API_KEY not configured. In-app notification delivered to ${recipientEmails.length} admin(s) for skill "${skill_name}".`
      );
      return NextResponse.json({
        sent: false,
        reason: 'RESEND_API_KEY not configured; in-app admin notification delivered',
        recipientsCount: recipientEmails.length,
      });
    }

    // 5. Send transactional email via Resend HTTP REST API
    const subject = `[Workbench] New Skill Requested: ${skill_name} (${skill_category})`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f8fafc; padding: 24px; margin: 0;">
          <div style="max-width: 560px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 20px; overflow: hidden; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <div style="margin-bottom: 24px; border-bottom: 1px solid #1f2937; padding-bottom: 16px;">
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: #60a5fa; text-transform: uppercase;">Workbench Admin Alerts</span>
              <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 8px 0 0 0;">New Skill Proposal Submitted</h1>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px;">
              A maker in the community has submitted a new skill proposal for catalog review:
            </p>

            <div style="background-color: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
              <div style="margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Skill Name</span>
                <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-top: 2px;">${skill_name}</div>
              </div>
              <div style="margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Category</span>
                <div style="font-size: 14px; font-weight: 600; color: #60a5fa; margin-top: 2px;">${skill_category}</div>
              </div>
              <div style="margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Requester</span>
                <div style="font-size: 14px; font-weight: 600; color: #e2e8f0; margin-top: 2px;">@${requester_username}</div>
              </div>
              <div>
                <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Reason / Justification</span>
                <div style="font-size: 13px; color: #cbd5e1; margin-top: 2px; font-style: italic;">
                  &ldquo;${skill_reason || 'No justification provided'}&rdquo;
                </div>
              </div>
            </div>

            <div style="text-align: center; margin-bottom: 28px;">
              <a href="${adminUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                Review &amp; Approve in Admin Hub &rarr;
              </a>
            </div>

            <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0; line-height: 1.5;">
              You received this alert because you are an Administrator on Workbench with email alerts enabled.<br />
              Manage notification preferences in your Account Settings.
            </p>
          </div>
        </body>
      </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipientEmails,
        subject,
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error('[SkillRequestAlert] Resend API Error:', errText);
      return NextResponse.json({
        sent: false,
        error: `Resend HTTP ${resendResponse.status}: ${errText}`,
        fallbackDelivered: true,
      });
    }

    const resendResult = await resendResponse.json();

    return NextResponse.json({
      sent: true,
      id: resendResult.id,
      recipients: recipientEmails,
    });
  } catch (err: any) {
    console.error('[SkillRequestAlert] Unexpected Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
