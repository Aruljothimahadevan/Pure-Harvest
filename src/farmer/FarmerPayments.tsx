import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import FarmerNavBar from "./FarmerTopNavBar";

export default function Payments() {
    const [showBankModal, setShowBankModal] = useState(false);
    const [bank, setBank] = useState<any>(null)
    const [holderName, setHolderName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [bankName, setBankName] = useState("");
    const [ifsc, setIfsc] = useState("");
    const [payments, setPayments] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const farmerId = sessionStorage.getItem("farmerId");

        if (!farmerId) return;
        fetch(`https://pure-harvest.onrender.com/api/farmer/bank-details/${farmerId}`)
            .then(res => res.json())
            .then(data => {
                setBank(data);
                setHolderName(data?.account_holder_name || "");
                setAccountNumber(data?.account_number || "");
                setBankName(data?.bank_name || "");
                setIfsc(data?.ifsc_code || "");
            })
            .catch(() => setBank(null));

        // Fetch payments
        fetch(`https://pure-harvest.onrender.com/api/farmer/payments/${farmerId}`)
            .then(res => res.json())
            .then(data => setPayments({
                total: data.total || 0,
                thisMonth: data.thisMonth || 0,
                pending: data.pending || 0,
                transactions: data.transactions || []
            }))
            .finally(() => setLoading(false));

    }, []);
    const downloadPDF = async () => {
        const element = document.getElementById("payment-report");
        if (!element) return;

        const canvas = await html2canvas(element);
        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF("p", "mm", "a4");
        const width = 210;
        const height = (canvas.height * width) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 10, width, height);
        pdf.save("payments-report.pdf");
    };
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 pt-16 pb-16">
                <FarmerNavBar />

                {/* Revenue skeleton */}
                <div className="bg-green-700 pt-6 pb-20 px-6 rounded-b-[3rem] shadow-lg animate-pulse">
                    <div className="max-w-md mx-auto space-y-6 text-center">
                        <div className="h-4 w-32 bg-white/30 rounded mx-auto" />
                        <div className="h-12 w-48 bg-white/40 rounded mx-auto" />

                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2].map(i => (
                                <div key={i} className="h-16 bg-white/20 rounded-2xl" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Transactions skeleton */}
                <main className="max-w-md mx-auto px-6 -mt-12 space-y-4">
                    {[1, 2, 3, 4].map(i => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl p-6 flex justify-between items-center shimmer"
                        >
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-200" />
                                <div className="space-y-2">
                                    <div className="h-3 w-24 bg-gray-200 rounded" />
                                    <div className="h-2 w-32 bg-gray-100 rounded" />
                                </div>
                            </div>
                            <div className="h-4 w-20 bg-gray-200 rounded" />
                        </div>
                    ))}
                </main>
            </div>
        );
    }
    
    const saveBankDetails = async () => {

        const farmerId = sessionStorage.getItem("farmerId");

        const res = await fetch(`https://pure-harvest.onrender.com/api/farmer/bank-details/${farmerId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                account_holder_name: holderName,
                account_number: accountNumber,
                bank_name: bankName,
                ifsc_code: ifsc
            })
        });
        const data = await res.json();

        if (data.success) {
            setBank({
                account_holder_name: holderName,
                account_number: accountNumber,
                bank_name: bankName,
                ifsc_code: ifsc
            });

            setShowBankModal(false);
        } else {
            alert("Failed to save bank details");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-16 pb-16 relative">            <FarmerNavBar />
            <div className="bg-green-700 pt-6 pb-20 px-6 rounded-b-[3rem] shadow-lg">
                <div className="max-w-md mx-auto">
                    <h1 className="text-white/80 text-sm font-bold uppercase tracking-widest mb-2 text-center">Total Revenue</h1>
                    <h2 className="text-white text-5xl font-black text-center mb-6">₹{payments?.total || 0}
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                            <p className="text-white/60 text-[10px] uppercase font-bold">This Month</p>
                            <p className="text-white text-xl font-bold">₹{payments?.thisMonth || 0}
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                            <p className="text-white/60 text-[10px] uppercase font-bold">Pending</p>
                            <p className="text-white text-xl font-bold">₹{payments?.pending || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Transaction List */}
            <main className="max-w-md mx-auto px-6 -mt-12">
                <div
                    id="payment-report"
                    className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden"
                >

                    <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-white">
                        <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Recent Transactions</h3>
                        <button
                            onClick={downloadPDF}
                            className="text-green-700 text-xs font-bold"
                        >
                            Download PDF
                        </button>
                    </div>

                    <div className="divide-y divide-gray-50">

                        {(!payments?.transactions || payments.transactions.length === 0) && (
                            <div className="p-10 text-center text-gray-400 font-semibold">
                                No transactions yet 💸
                            </div>
                        )}

                        {payments?.transactions?.map((item: any) => (


                            <motion.div
                                whileHover={{ backgroundColor: "#f9fafb" }}
                                key={item.id}
                                className="p-6 flex justify-between items-center"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Icon based on status */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${item.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                        }`}>
                                        {item.status === 'Completed' ? '✓' : '⌛'}
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm">{item.buyer}</h4>
                                        <p className="text-gray-400 text-xs">{item.crop} • {item.date}</p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="font-black text-gray-800 leading-none">
                                        ₹{item.amount.toLocaleString()}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* 3. Bank Account Quick Info (Optional UI) */}
                <div className="mt-6 p-5 bg-white rounded-3xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-2xl">🏦</div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Linked Bank</p>
                            <p className="text-sm font-bold text-gray-700">
                                {bank?.account_number && bank?.bank_name
                                    ? `${bank.bank_name} **** ${bank.account_number.slice(-4)}`
                                    : "No bank linked"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowBankModal(true)}
                        className="text-green-600 text-xs font-bold underline"
                    >
                        Change
                    </button>
                </div>
            </main>
            {showBankModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                    <div className="bg-white rounded-2xl p-6 w-[350px] shadow-xl">

                        <h2 className="text-lg font-bold mb-4">Update Bank Details</h2>

                        <input
                            value={holderName}
                            onChange={(e) => setHolderName(e.target.value)}
                            placeholder="Account Holder Name"
                            className="w-full border p-2 rounded mb-3"
                        />

                        <input
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="Account Number"
                            className="w-full border p-2 rounded mb-3"
                        />

                        <input
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="Bank Name"
                            className="w-full border p-2 rounded mb-3"
                        />

                        <input
                            value={ifsc}
                            onChange={(e) => setIfsc(e.target.value)}
                            placeholder="IFSC Code"
                            className="w-full border p-2 rounded mb-4"
                        />

                        <div className="flex justify-end gap-2">

                            <button
                                onClick={() => setShowBankModal(false)}
                                className="px-4 py-2 text-gray-600"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={saveBankDetails}
                                className="px-4 py-2 bg-green-600 text-white rounded"
                            >
                                Save
                            </button>

                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
