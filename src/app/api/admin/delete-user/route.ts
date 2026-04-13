import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: "Missing required userId" }, { status: 400 });
        }

        const adminAuthClient = createAdminClient().auth.admin;

        // Use the service role key to delete a user from Supabase Auth
        // Because of ON DELETE CASCADE, this will also remove their user_profiles record
        const { error } = await adminAuthClient.deleteUser(userId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}
