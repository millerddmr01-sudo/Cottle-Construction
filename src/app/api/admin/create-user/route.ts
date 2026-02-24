import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, fullName, accountType } = body;

        if (!email || !password || !fullName || !accountType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const adminAuthClient = createAdminClient().auth.admin;

        // Uses the service role key to create a user and confirm their email instantly
        const { data, error } = await adminAuthClient.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm the employee's email
            user_metadata: {
                full_name: fullName,
                role: accountType, // Triggers the db function to set role in user_profiles
            },
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, user: data.user }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}
