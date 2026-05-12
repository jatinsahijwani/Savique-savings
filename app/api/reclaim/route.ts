import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { address } = await req.json();

        if (!address) {
            return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
        }

        const APP_ID = process.env.NEXT_PUBLIC_RECLAIM_APP_ID;
        const APP_SECRET = process.env.RECLAIM_APP_SECRET;

        if (!APP_ID || !APP_SECRET) {
            return NextResponse.json({ error: "Reclaim credentials missing" }, { status: 500 });
        }

        // Initialize the ReclaimProofRequest
        const reclaimClient = new ReclaimProofRequest(APP_ID);
        
        // Generate the signature
        const signature = await reclaimClient.generateSignature(APP_SECRET);

        return NextResponse.json({ signature });
    } catch (error) {
        console.error("Error in Reclaim API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
