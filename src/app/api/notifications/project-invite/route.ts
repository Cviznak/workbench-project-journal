import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
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
    const { projectId, targetUserId } = body;

    if (!projectId || !targetUserId) {
      return NextResponse.json(
        { error: 'Bad Request: Missing projectId or targetUserId parameter' },
        { status: 400 }
      );
    }

    // 2. Fetch invite payload via SECURITY DEFINER RPC
    const { data: payloadList, error: rpcError } = await supabase.rpc(
      'get_project_invite_email_payload',
      {
        p_project_id: projectId,
        p_target_user_id: targetUserId,
      }
    );

    if (rpcError) {
      console.error('[ProjectInviteAlert] RPC Error:', rpcError);
      return NextResponse.json(
        { error: rpcError.message || 'Failed to fetch invite payload' },
        { status: 400 }
      );
    }

    if (!payloadList || payloadList.length === 0) {
      return NextResponse.json({
        sent: false,
        message: 'Recipient has disabled project invitation emails or is not found',
      });
    }

    const {
      invitee_email,
      invitee_name,
      project_name,
      inviter_username,
    } = payloadList[0];

    if (!invitee_email || !invitee_email.includes('@')) {
      return NextResponse.json({
        sent: false,
        message: 'No valid email address found for invited user',
      });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      'Workbench <notifications@mail.workbenchsoc.com>';
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.nextUrl.origin ||
      'https://www.workbenchsoc.com';
    const projectUrl = `${siteUrl}/projects/${projectId}`;

    // 3. Graceful fallback if RESEND_API_KEY is not yet configured
    if (!resendApiKey) {
      console.info(
        `[ProjectInviteAlert] RESEND_API_KEY not configured. In-app invite delivered for project "${project_name}".`
      );
      return NextResponse.json({
        sent: false,
        reason: 'RESEND_API_KEY not configured; in-app invite delivered',
      });
    }

    // 4. Send transactional email via official Resend SDK
    const resend = new Resend(resendApiKey);
    const subject = `[Workbench] ${inviter_username} invited you to collaborate on "${project_name}"`;

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
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: #60a5fa; text-transform: uppercase;">Workbench Team Invitation</span>
              <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 8px 0 0 0;">You're Invited to Collaborate</h1>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px;">
              Hello ${invitee_name},<br /><br />
              <strong>${inviter_username}</strong> has invited you to join their project workshop on Workbench:
            </p>

            <div style="background-color: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
              <div style="margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Project Name</span>
                <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-top: 2px;">${project_name}</div>
              </div>
              <div>
                <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Invited By</span>
                <div style="font-size: 14px; font-weight: 600; color: #60a5fa; margin-top: 2px;">@${inviter_username}</div>
              </div>
            </div>

            <div style="text-align: center; margin-bottom: 28px;">
              <a href="${projectUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                Accept Invitation in Workbench &rarr;
              </a>
            </div>

            <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0; line-height: 1.5;">
              You received this alert because a teammate invited you to their project on Workbench.<br />
              Manage notification preferences in your Account Settings.
            </p>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send(
      {
        from: fromEmail,
        to: [invitee_email],
        subject,
        html: htmlContent,
      },
      {
        idempotencyKey: `project-invite/${projectId}/${targetUserId}/${Date.now()}`,
      }
    );

    if (error) {
      console.error('[ProjectInviteAlert] Resend SDK Error:', error.message);
      return NextResponse.json({
        sent: false,
        error: error.message,
        fallbackDelivered: true,
      });
    }

    console.info(
      `[ProjectInviteAlert] Invite email sent to ${invitee_email}. ID: ${data?.id}`
    );

    return NextResponse.json({
      sent: true,
      id: data?.id,
      recipient: invitee_email,
    });
  } catch (err: any) {
    console.error('[ProjectInviteAlert] Unexpected Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
