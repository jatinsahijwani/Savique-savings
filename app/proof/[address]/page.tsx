"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Shield, CheckCircle, Lock, Calendar, Wallet, Landmark, Activity, Award } from "lucide-react";
import { motion } from "framer-motion";
import { createPublicClient, http, formatUnits } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { CONTRACTS, VAULT_ABI, VAULT_FACTORY_ABI } from "@/lib/contracts";
import { getReceiptsByWallet, Receipt } from "@/lib/receiptService";

export default function PublicProofPage() {
    const { address } = useParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchProofData = async () => {
            if (!address) return;
            try {
                const client = createPublicClient({
                    chain: arbitrumSepolia,
                    transport: http()
                });

                // 1. Get all vaults for this user
                const vaults = await client.readContract({
                    address: CONTRACTS.arbitrumSepolia.VaultFactory,
                    abi: VAULT_FACTORY_ABI,
                    functionName: "getUserVaults",
                    args: [address as `0x${string}`]
                }) as `0x${string}`[];

                // 2. Fetch details for each vault
                let totalLocked = 0n;
                const vaultDetails = await Promise.all(vaults.map(async (v) => {
                    const [purpose, balance, unlockTime] = await Promise.all([
                        client.readContract({ address: v, abi: VAULT_ABI, functionName: "purpose" }),
                        client.readContract({ address: v, abi: VAULT_ABI, functionName: "totalAssets" }),
                        client.readContract({ address: v, abi: VAULT_ABI, functionName: "unlockTimestamp" })
                    ]);
                    totalLocked += (balance as bigint);
                    return { address: v, purpose, balance, unlockTime };
                }));

                // 3. Get history for Resilience Score
                const receipts = await getReceiptsByWallet(address as string);
                const completed = receipts.filter(r => r.type === 'completed').length;
                const broken = receipts.filter(r => r.type === 'breaked').length;
                const resilienceScore = (completed + broken === 0) ? 100 : Math.round((completed / (completed + broken)) * 100);

                setData({
                    totalLocked,
                    vaults: vaultDetails,
                    resilienceScore,
                    totalVaults: vaults.length
                });
            } catch (error) {
                console.error("Error fetching proof data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProofData();
    }, [address]);

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Activity className="w-10 h-10 text-primary animate-spin" />
        </div>
    );

    if (!data) return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
            Proof not found.
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-950 p-4 md:p-12 font-sans selection:bg-primary/30">
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Institutional Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-primary">
                            <Shield className="w-6 h-6" />
                            <span className="font-black tracking-tighter text-xl">SAVIQUE PROTOCOL</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">On-Chain Solvency Certificate</h1>
                        <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Verification ID: {address?.slice(0, 16)}...</p>
                    </div>
                    <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-bold text-green-500 uppercase">Live On-Chain Data</span>
                    </div>
                </div>

                {/* Main Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-8 bg-zinc-900/50 border-white/5 space-y-2">
                        <p className="text-gray-500 text-xs font-bold uppercase">Total USDC Locked</p>
                        <p className="text-4xl font-black text-white">{formatUnits(data.totalLocked, 6)}</p>
                        <p className="text-[10px] text-gray-600">Verified via Arbitrum Network</p>
                    </Card>
                    <Card className="p-8 bg-zinc-900/50 border-white/5 space-y-2">
                        <p className="text-gray-500 text-xs font-bold uppercase">Resilience Score</p>
                        <p className="text-4xl font-black text-primary">{data.resilienceScore}%</p>
                        <p className="text-[10px] text-gray-600">Commitment Completion Rate</p>
                    </Card>
                    <Card className="p-8 bg-zinc-900/50 border-white/5 space-y-2">
                        <p className="text-gray-500 text-xs font-bold uppercase">Active Vaults</p>
                        <p className="text-4xl font-black text-white">{data.totalVaults}</p>
                        <p className="text-[10px] text-gray-600">Cryptographically Sealed</p>
                    </Card>
                </div>

                {/* Vault Details Table */}
                <div className="space-y-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gray-500" />
                        Locked Capital Breakdown
                    </h3>
                    <div className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/30">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5">
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase">Purpose</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase">Amount</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase">Unlock Date</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.vaults.map((v: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-white font-medium">{v.purpose}</td>
                                        <td className="p-4 text-white font-bold">{formatUnits(v.balance, 6)} USDC</td>
                                        <td className="p-4 text-gray-400 text-sm">
                                            {new Date(Number(v.unlockTime) * 1000).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase">Sealed</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Institutional Footer */}
                <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between gap-8 items-center text-center md:text-left">
                    <div className="space-y-2">
                        <h4 className="text-white font-bold">About this Certificate</h4>
                        <p className="text-xs text-gray-500 max-w-sm">
                            This is a real-time audit generated by the Savique Protocol. It confirms that the associated wallet has committed capital to smart contracts on the Arbitrum network. The funds are non-custodial but restricted by time-locks.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                            <Award className="text-gray-500" />
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                            <Landmark className="text-gray-500" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
