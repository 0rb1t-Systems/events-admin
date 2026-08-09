import React, { PropsWithChildren, Suspense, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Footer from "./Footer";
import Header from "./Header";
import Setting from "./Setting";
import { IRootState } from "../store";
import App from "../App";
import Sidebar from "./Sidebar";
import Portals from "../components/Portals";
import Loader from "../components/Loader";
import BackToTop from "../components/BackToTop";
import { toggleSidebar } from "../store/themeConfigSlice";

const DefaultLayout = ({ children }: PropsWithChildren) => {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();

    const [showLoader, setShowLoader] = useState(true);

    useEffect(() => {
        const screenLoader = document.getElementsByClassName("screen_loader");
        if (screenLoader?.length) {
            screenLoader[0].classList.add("animate__fadeOut");
            setTimeout(() => {
                setShowLoader(false);
            }, 200);
        }
    }, []);

    return (
        <App>
            {/* BEGIN MAIN CONTAINER */}
            <div className="relative">
                {/* sidebar menu overlay */}
                <div
                    className={`${
                        (!themeConfig.sidebar && "hidden") || ""
                    } fixed inset-0 bg-[black]/60 z-50 lg:hidden`}
                    onClick={() => dispatch(toggleSidebar())}
                ></div>
                {/* screen loader */}
                {showLoader && <Loader />}
                <BackToTop />

                {/* BEGIN APP SETTING LAUNCHER */}
                <Setting />
                {/* END APP SETTING LAUNCHER */}

                <div
                    className={`${themeConfig.navbar} main-container text-black dark:text-white-dark min-h-screen`}
                >
                    {/* BEGIN SIDEBAR */}
                    <Sidebar />
                    {/* END SIDEBAR */}

                    <div className="main-content flex flex-col min-h-screen">
                        {/* BEGIN TOP NAVBAR */}
                        <Header />
                        {/* END TOP NAVBAR */}

                        {/* BEGIN CONTENT AREA */}
                        <Suspense>
                            <div
                                className={`${themeConfig.animation} p-6 animate__animated`}
                            >
                                {children}
                            </div>
                        </Suspense>
                        {/* END CONTENT AREA */}

                        {/* BEGIN FOOTER */}
                        <Footer />
                        {/* END FOOTER */}
                        <Portals />
                    </div>
                </div>
            </div>
        </App>
    );
};

export default DefaultLayout;
