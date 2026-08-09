import React, { useEffect, useState } from "react";

const BackToTop = () => {
    const [showTopButton, setShowTopButton] = useState(false);

    const goToTop = () => {
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    };

    const onScrollHandler = () => {
        if (
            document.body.scrollTop > 50 ||
            document.documentElement.scrollTop > 50
        ) {
            setShowTopButton(true);
        } else {
            setShowTopButton(false);
        }
    };

    useEffect(() => {
        window.addEventListener("scroll", onScrollHandler);

        return () => {
            window.removeEventListener("onscroll", onScrollHandler);
        };
    }, []);

    return (
        <div className="fixed bottom-6 ltr:right-6 rtl:left-6 z-50">
            {showTopButton && (
                <button
                    type="button"
                    className="btn btn-outline-primary rounded-full p-2 animate-pulse bg-[#fafafa] dark:bg-[#060818] dark:hover:bg-primary"
                    onClick={goToTop}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 7l4-4m0 0l4 4m-4-4v18"
                        />
                    </svg>
                </button>
            )}
        </div>
    );
};

export default BackToTop;
