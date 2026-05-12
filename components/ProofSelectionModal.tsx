"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, 
    Calendar, 
    CheckCircle2, 
    ShieldCheck, 
    Clock, 
    Filter, 
    ChevronRight, 
    Copy, 
    Check, 
    Loader2,
    Lock,
    ExternalLink,
    CalendarDays,
    Download,
    QrCode
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt } from "@/lib/receiptService";
import { createSharedProof } from "@/lib/proofService";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { QRCodeCanvas } from "qrcode.react";

interface ProofSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    receipts: Receipt[];
    walletAddress: string;
}

const toastStyle = {
    className: "bg-primary/10 border-primary/20 text-primary",
    style: {
        backgroundColor: 'rgba(230, 32, 88, 0.1)',
        borderColor: 'rgba(230, 32, 88, 0.2)',
        color: '#E62058'
    }
};

export function ProofSelectionModal({ isOpen, onClose, receipts, walletAddress }: ProofSelectionModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedVaults, setSelectedVaults] = useState<Set<string>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    // Date range state
    const [startDateStr, setStartDateStr] = useState("");
    const [endDateStr, setEndDateStr] = useState("");

    const hasInitialized = useRef(false);
    const qrRef = useRef<HTMLCanvasElement>(null);

    const startDate = useMemo(() => {
        return startDateStr ? new Date(startDateStr).getTime() : 0;
    }, [startDateStr]);

    const endDate = useMemo(() => {
        return endDateStr ? new Date(endDateStr).getTime() : Date.now();
    }, [endDateStr]);

    const filteredUniqueVaults = useMemo(() => {
        const filtered = receipts.filter(r => r.timestamp >= startDate && r.timestamp <= endDate && r.vaultAddress);
        
        const uniqueMap = new Map<string, { address: string; purpose: string; totalAmount: number; createdAt: number }>();
        
        filtered.forEach(r => {
            if (!r.vaultAddress) return;
            const existing = uniqueMap.get(r.vaultAddress);
            const amount = parseFloat(r.amount) || 0;

            if (existing) {
                if (r.type === 'created') {
                    existing.createdAt = Math.min(existing.createdAt, r.timestamp);
                    existing.purpose = r.purpose;
                }
            } else {
                uniqueMap.set(r.vaultAddress, {
                    address: r.vaultAddress,
                    purpose: r.purpose,
                    totalAmount: amount,
                    createdAt: r.timestamp
                });
            }
        });

        return Array.from(uniqueMap.values()).sort((a, b) => b.createdAt - a.createdAt);
    }, [receipts, startDate, endDate]);

    useEffect(() => {
        if (isOpen && !hasInitialized.current) {
            setSelectedVaults(new Set());
            hasInitialized.current = true;
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            hasInitialized.current = false;
            setStep(1);
            setGeneratedLink(null);
            setSelectedVaults(new Set());
            setStartDateStr("");
            setEndDateStr("");
        }
    }, [isOpen]);

    const handleToggleVault = (address: string) => {
        const newSet = new Set(selectedVaults);
        if (newSet.has(address)) {
            newSet.delete(address);
        } else {
            newSet.add(address);
        }
        setSelectedVaults(newSet);
    };

    const toggleAll = () => {
        if (selectedVaults.size === filteredUniqueVaults.length) {
            setSelectedVaults(new Set());
        } else {
            setSelectedVaults(new Set(filteredUniqueVaults.map(v => v.address)));
        }
    };

    const handleGenerate = async () => {
        try {
            setIsGenerating(true);
            
            const proofId = await createSharedProof({
                walletAddress: walletAddress.toLowerCase(),
                intervalType: 'custom',
                startDate,
                endDate,
                allowedVaults: Array.from(selectedVaults)
            });

            const link = `${window.location.origin}/verify/${proofId}`;
            setGeneratedLink(link);
            setStep(2);
            toast.success("Verifiable Proof Generated!", toastStyle);
        } catch (error) {
            console.error("Error generating proof:", error);
            toast.error("Failed to generate proof. Try again.", toastStyle);
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadQR = () => {
        if (!qrRef.current) return;
        const canvas = qrRef.current;
        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = url;
        link.download = `savique-proof-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("QR Code Downloaded!", toastStyle);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 w-full h-full z-[100] flex items-center justify-center px-4 bg-black/70 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-xl bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                >
                    <style jsx global>{`
                        .no-scrollbar::-webkit-scrollbar { display: none; }
                        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    `}</style>

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between ">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <ShieldCheck className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Share Financial Proof</h2>
                                <p className="text-xs text-gray-400">Securely prove your savings to third parties</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {step === 1 ? (
                            <>
                                {/* Date Selection */}
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        Select Time Range
                                    </label>
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] uppercase font-bold text-gray-500 ml-1">Start Date</p>
                                            <Input 
                                                type="date" 
                                                value={startDateStr}
                                                onChange={(e) => setStartDateStr(e.target.value)}
                                                className="bg-white/5 border-white/10 text-white h-11 focus:ring-primary/20" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] uppercase font-bold text-gray-500 ml-1">End Date</p>
                                            <Input 
                                                type="date" 
                                                value={endDateStr}
                                                onChange={(e) => setEndDateStr(e.target.value)}
                                                className="bg-white/5 border-white/10 text-white h-11 focus:ring-primary/20" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Filter Logic: Vault Selection */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                            <Filter className="w-4 h-4 text-primary" />
                                            Select Savings to Verify ({selectedVaults.size})
                                        </label>
                                        <button 
                                            onClick={toggleAll}
                                            className="text-[10px] uppercase font-black tracking-widest text-primary hover:text-primary/80 transition-colors"
                                        >
                                            {selectedVaults.size === filteredUniqueVaults.length 
                                                ? 'Unselect All' 
                                                : `Select All (${filteredUniqueVaults.length - selectedVaults.size})`}
                                        </button>
                                    </div>
                                    
                                    <div className="max-h-[150px] overflow-y-auto space-y-2 no-scrollbar pr-1">
                                        {filteredUniqueVaults.length === 0 ? (
                                            <div className="p-8 bg-white/5 border border-dashed border-white/10 rounded-xl text-center">
                                                <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                                                <p className="text-xs text-gray-500">
                                                    {!startDateStr || !endDateStr 
                                                        ? "Please select a date range above." 
                                                        : "No savings found in this range."}
                                                </p>
                                            </div>
                                        ) : (
                                            filteredUniqueVaults.map((vault) => (
                                                <button 
                                                    key={vault.address}
                                                    onClick={() => handleToggleVault(vault.address)}
                                                    className={`w-full py-2 px-4 rounded-xl border transition-all text-left flex items-center justify-between group bg-white/5 border-white/5 hover:border-white/10`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${selectedVaults.has(vault.address) ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-600'}`}>
                                                            <Lock className="w-3 h-3" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{vault.purpose}</p>
                                                            <div className="flex items-center gap-3 text-[10px] text-gray-500">
                                                                <span>{vault.totalAmount} USDC</span>
                                                                <span className="flex items-center gap-1">
                                                                    <CalendarDays className="w-3 h-3" />
                                                                    {new Date(vault.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                                        selectedVaults.has(vault.address)
                                                        ? 'bg-primary border-primary scale-110 shadow-lg shadow-primary/20'
                                                        : 'border-white/10'
                                                    }`}>
                                                        {selectedVaults.has(vault.address) && <Check className="w-4 h-4 text-white stroke-[3px]" />}
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 italic text-center">
                                        Select the savings you want to prove to your landlord.
                                    </p>
                                </div>

                                <div className="flex justify-center items-center">
                                    <Button 
                                        onClick={handleGenerate}
                                        disabled={isGenerating || selectedVaults.size === 0 || !startDateStr || !endDateStr}
                                        className="w-[50%] mx-0 h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all group"
                                    >
                                        {isGenerating ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            "Generate"
                                        )}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6 text-center">
                                {/* Success Icon & QR Code Row */}
                                <div className="flex flex-col items-center gap-6">
                                    <div className="relative group cursor-pointer" onClick={downloadQR}>
                                        <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-2xl group-hover:bg-primary/30 transition-all opacity-50" />
                                        <div className="relative p-4 bg-white rounded-2xl shadow-2xl transition-transform hover:scale-[1.02]">
                                            <QRCodeCanvas 
                                                ref={qrRef}
                                                value={generatedLink || ""} 
                                                size={160} 
                                                level="H"
                                                includeMargin={false}
                                                imageSettings={{
                                                    src: "/logo3.png",
                                                    x: undefined,
                                                    y: undefined,
                                                    height: 24,
                                                    width: 24,
                                                    excavate: true,
                                                }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                                                <Download className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-400 max-w-[280px] mx-auto">
                                            Landlords can scan this code to view your verified savings on-chain.
                                        </p>
                                        <button 
                                            onClick={downloadQR}
                                            className="text-[10px] uppercase font-bold text-primary hover:underline flex items-center justify-center gap-1.5 mx-auto"
                                        >
                                            <Download className="w-3 h-3" />
                                            Download QR Code
                                        </button>
                                    </div>
                                </div>

                                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-4">
                                    <p className="text-[10px] font-mono text-gray-400 truncate text-left pl-2">
                                        {generatedLink}
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            if (generatedLink) {
                                                navigator.clipboard.writeText(generatedLink);
                                                setIsCopied(true);
                                                setTimeout(() => setIsCopied(false), 2000);
                                                toast.success("Link copied!", toastStyle);
                                            }
                                        }}
                                        className="bg-primary/10 hover:bg-primary/20 text-primary gap-2 h-9 px-4 rounded-xl font-bold text-xs"
                                    >
                                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        {isCopied ? "Copied" : "Copy"}
                                    </Button>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="ghost" className="flex-1 border border-white/10 text-gray-400 hover:text-white" onClick={() => setStep(1)}>
                                        Edit Filters
                                    </Button>
                                    <Button className="flex-1 bg-white text-black hover:bg-white/90 gap-2 font-bold" onClick={() => window.open(generatedLink!, '_blank')}>
                                        <ExternalLink className="w-4 h-4" /> Preview
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
