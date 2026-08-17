import React from "react";
import { useParams } from "react-router-dom";
import DetailPageHeader from "../../components/DetailPageHeader";
import PayoutDetail from "./components/PayoutDetail";

const PayoutShow = () => {
    const { id } = useParams();
    const payoutId = Number(id);

    if (!Number.isFinite(payoutId) || payoutId <= 0) {
        return <div className="p-4 text-sm text-red-500">Invalid payout</div>;
    }

    return (
        <div>
            <DetailPageHeader
                backTo="/payouts"
                backLabel="Back to Payouts"
                crumbs={[
                    { title: "Dashboard", path: "/" },
                    { title: "Payouts", path: "/payouts" },
                    { title: `#${payoutId}` },
                ]}
            />
            <div className="panel">
                <PayoutDetail payoutId={payoutId} />
            </div>
        </div>
    );
};

export default PayoutShow;
