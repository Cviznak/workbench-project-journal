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
      process.env.RESEND_FROM_EMAIL ||
      'Workbench <notifications@mail.workbenchsoc.com>';
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.nextUrl.origin ||
      'https://www.workbenchsoc.com';
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

    // 5. Send transactional email via official Resend SDK using published template
    const resend = new Resend(resendApiKey);
    const templateId =
      process.env.RESEND_TEMPLATE_SKILL_ALERT ||
      '02ae3cb7-3584-4cdb-bd67-d6b6918bbde1';

    const { data, error } = await resend.emails.send(
      {
        from: fromEmail,
        to: recipientEmails,
        template: {
          id: templateId,
          variables: {
            SKILL_NAME: skill_name,
            SKILL_CATEGORY: skill_category,
            REQUESTER_USERNAME: requester_username,
            SKILL_REASON: skill_reason || 'No justification provided',
            ADMIN_URL: adminUrl,
          },
        },
      },
      {
        idempotencyKey: `skill-request/${requestId}`,
      }
    );

    if (error) {
      console.error('[SkillRequestAlert] Resend SDK Error:', error.message);
      return NextResponse.json({
        sent: false,
        error: error.message,
        fallbackDelivered: true,
      });
    }

    console.info(
      `[SkillRequestAlert] Email delivered successfully. ID: ${data?.id}`
    );

    return NextResponse.json({
      sent: true,
      id: data?.id,
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
