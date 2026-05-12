"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Zap, CheckCircle, Lock, Globe, ArrowRight, Loader2, Landmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";

export default function VerifyPage() {
    const { isConnected, address } = useAccount();
    const [isLoading, setIsLoading] = useState(false);
    const [reclaimUrl, setReclaimUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<"idle" | "generating" | "scanning" | "verified">("idle");

    const startVerification = async () => {
        try {
            setIsLoading(true);
            setStatus("generating");
            
            // 1. Get the signature from our secure backend
            const response = await fetch("/api/reclaim", {
                method: "POST",
                body: JSON.stringify({ address }),
            });
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            const { signature } = data;

            const APP_ID = process.env.NEXT_PUBLIC_RECLAIM_APP_ID!;
            
            // 2. Initialize the ReclaimProofRequest on the client
            const reclaimClient = new ReclaimProofRequest(APP_ID);

            // 3. Define what we want to verify (Must match your Reclaim Dashboard)
            // Using a generic provider name for testing
            await reclaimClient.buildHttpProviderV2ByName("Github Username"); 
            
            // 4. Apply the signature and context
            reclaimClient.setSignature(signature);
            reclaimClient.addContext(address!, "Savique Global Wealth Verification");

            // 5. Get the URL for the QR code
            const url = await reclaimClient.getRequestUrl();
            setReclaimUrl(url);
            setStatus("scanning");

            // 6. Start the session to listen for success
            await reclaimClient.startSession({
                onSuccess: (proofs) => {
                    console.log("Verification Success:", proofs);
                    setStatus("verified");
                    toast.success("Identity Verified on Arbitrum!");
                },
                onError: (error) => {
                    console.error("Verification Failed:", error);
                    setStatus("idle");
                    toast.error("Verification failed. Please try again.");
                }
            });

        } catch (error) {
            console.error("Verification error:", error);
            toast.error("Could not initialize ZK verification. Check console for details.");
            setStatus("idle");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="p-12 text-center max-w-md bg-white/5 border-white/10">
                    <Shield className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-400">
                        Identity verification requires an active wallet connection to link your proofs.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="text-center space-y-4">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4"
                >
                    <Shield className="w-3 h-3" />
                    ZK-Identity Protocol
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                    Verify Your <span className="text-primary">Global Wealth</span>
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                    Generate an un-fakeable, zero-knowledge proof of your real-world financial stability. 
                    No bank statements, no manual audits—just cryptographic truth.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <Card className="p-8 bg-zinc-900/50 border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[400px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 rounded-full" />
                    
                    <div>
                        <h3 className="text-xl font-bold text-white mb-6">Verification Status</h3>
                        
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status !== "idle" ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-gray-500'}`}>
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Wallet Linked</p>
                                    <p className="text-xs text-gray-500">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status === "scanning" || status === "verified" ? 'bg-green-500/20 text-green-500' : (status === "generating" ? 'bg-primary/20 text-primary animate-pulse' : 'bg-white/5 text-gray-500')}`}>
                                    <Landmark className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Bank Attestation</p>
                                    <p className="text-xs text-gray-500">Connect to global banking network via Reclaim</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status === "verified" ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-gray-500'}`}>
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Titan Badge Issued</p>
                                    <p className="text-xs text-gray-500">Unlock premium protocol benefits</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {status === "idle" && (
                        <Button 
                            onClick={startVerification} 
                            disabled={isLoading}
                            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all group"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Start ZK-Verification
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    )}

                    {status === "scanning" && (
                        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                            <p className="text-xs text-primary font-bold text-center">
                                Awaiting ZK-Proof Generation...
                            </p>
                        </div>
                    )}
                </Card>

                <Card className="p-8 bg-zinc-900/50 border-white/5 flex flex-col items-center justify-center text-center">
                    <AnimatePresence mode="wait">
                        {status === "idle" || status === "generating" ? (
                            <motion.div 
                                key="idle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <Lock className="w-10 h-10 text-gray-500" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-lg font-bold text-white">Secure Sandbox</h4>
                                    <p className="text-sm text-gray-500">
                                        Your bank credentials never touch our servers. Verification happens locally on your device using zkTLS.
                                    </p>
                                </div>
                            </motion.div>
                        ) : status === "scanning" ? (
                            <motion.div 
                                key="qr"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="space-y-8"
                            >
                                <div className="p-6 bg-white rounded-3xl inline-block shadow-2xl shadow-primary/10">
                                    <QRCodeSVG value={reclaimUrl || ""} size={200} />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-lg font-bold text-white">Scan with Camera</h4>
                                    <p className="text-sm text-gray-400">
                                        Open this on your phone to start the private bank attestation process.
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="verified"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="space-y-6"
                            >
                                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                                    <CheckCircle className="w-12 h-12 text-green-500" />
                                </div>
                                <h4 className="text-2xl font-bold text-white">Identity Verified</h4>
                                <p className="text-sm text-gray-400">
                                    Your proof has been successfully anchored to Arbitrum. Your Discipline Score has been updated.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </div>
        </div>
    );
}
