import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, fullName } = body;

        if (!email || !password || !fullName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const adminAuthClient = createAdminClient().auth.admin;

        // Creates the admin user directly
        const { data, error } = await adminAuthClient.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: "admin",
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
