import React from "react";
import { useParams } from "react-router-dom";
import DetailPageHeader from "../../components/DetailPageHeader";
import CertificateDetail from "./components/CertificateDetail";

const CertificateShow = () => {
    const { id } = useParams();
    const certificateId = Number(id);

    if (!Number.isFinite(certificateId) || certificateId <= 0) {
        return <div className="p-4 text-sm text-red-500">Invalid certificate</div>;
    }

    return (
        <div>
            <DetailPageHeader
                backTo="/certificates"
                backLabel="Back to Certificates"
                crumbs={[
                    { title: "Dashboard", path: "/" },
                    { title: "Certificates", path: "/certificates" },
                    { title: `#${certificateId}` },
                ]}
            />
            <div className="panel">
                <CertificateDetail certificateId={certificateId} />
            </div>
        </div>
    );
};

export default CertificateShow;
