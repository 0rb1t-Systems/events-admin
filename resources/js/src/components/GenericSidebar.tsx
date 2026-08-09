import React, { useEffect, useState, useRef } from "react";

interface GenericSidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    title?: string;
    width?: string;
    closeButtonPosition?: "top-right" | "center" | "both";
    children: React.ReactNode;
    footerActions?: React.ReactNode;
}

const GenericSidebar: React.FC<GenericSidebarProps> = ({
    isOpen,
    setIsOpen,
    title,
    width = "400px",
    closeButtonPosition = "top-right",
    children,
    footerActions,
}) => {
    const [visible, setVisible] = useState(isOpen);
    const [shouldRender, setShouldRender] = useState(isOpen);
    const closingRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setVisible(true);
            closingRef.current = false;
        } else if (!closingRef.current) {
            // Start closing animation
            setVisible(false);
            closingRef.current = true;
            // Wait for animation before unmounting
            const timeout = setTimeout(() => {
                setShouldRender(false);
                setIsOpen(false); // Notify parent after animation
            }, 300);
            return () => clearTimeout(timeout);
        }
    }, [isOpen, setIsOpen]);

    // Lock body scroll when sidebar is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!shouldRender) return null;

    // Handle close with animation
    const handleClose = () => {
        setVisible(false);
        closingRef.current = true;
        setTimeout(() => {
            setShouldRender(false);
            setIsOpen(false);
        }, 300);
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 z-[51] transition-opacity duration-300 ${
                    visible ? "animate-fadeIn" : "animate-fadeOut"
                }`}
                onClick={handleClose}
            ></div>
            {/* Sidebar */}
            <aside
                className={`fixed right-0 top-0 h-full w-full max-w-full bg-white dark:bg-[#1a2236] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] dark:shadow-[0_8px_32px_0_rgba(10,20,50,0.85)] border-l border-gray-200 dark:border-[#232a3b] z-[52] flex flex-col transition-transform duration-300 transform ${
                    visible ? "animate-slideInRight" : "animate-slideOutRight"
                } overflow-y-auto`}
                style={{
                    width,
                    animation: `${
                        visible ? "slideInRight" : "slideOutRight"
                    } 0.3s forwards`,
                }}
            >
                {/* Sticky Header */}
                {title && (
                    <div className="sticky top-0 left-0 right-0 z-30 bg-white dark:bg-[#232a3b] border-b border-gray-200 dark:border-[#232a3b] shadow-sm px-6 pt-6 pb-3 flex flex-col items-center ">
                        <div className="text-center relative w-full">
                            <h4 className="mb-1 dark:text-gray-100 text-lg font-semibold">
                                {title}
                            </h4>
                            {(closeButtonPosition === "top-right" ||
                                closeButtonPosition === "both") && (
                                <button
                                    type="button"
                                    className="absolute top-0 right-0 text-gray-400 hover:text-red-400 dark:text-gray-400 dark:hover:text-red-400 text-2xl focus:outline-none transition-colors duration-150 p-1 focus:ring-2 focus:ring-primary"
                                    onClick={handleClose}
                                    aria-label="Close sidebar"
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {(closeButtonPosition === "center" ||
                    closeButtonPosition === "both") && (
                    <button
                        type="button"
                        className="bg-primary ltr:rounded-tl-full rtl:rounded-tr-full ltr:rounded-bl-full rtl:rounded-br-full absolute ltr:-left-12 rtl:-right-12 top-0 bottom-0 my-auto w-12 h-10 flex justify-center items-center text-white cursor-pointer shadow-lg hover:bg-primary/90 transition-colors duration-200 z-[53]"
                        onClick={handleClose}
                        aria-label="Close sidebar"
                        style={{ outline: "none" }}
                    >
                        <span className="text-2xl">×</span>
                    </button>
                )}
                <div
                    className="flex-1 px-6 text-gray-900 dark:text-gray-100 pb-24"
                    style={{ paddingTop: title ? 0 : "1.5rem" }}
                >
                    {children}
                </div>
                {footerActions && (
                    <div className="sticky bottom-0 left-0 right-0 w-full bg-white dark:bg-[#232a3b] border-t border-gray-200 dark:border-[#232a3b] py-4 flex justify-end gap-3 z-20 shadow-lg px-10">
                        {footerActions}
                    </div>
                )}
            </aside>
            {/* Keyframes for slide in/out and fade in/out */}
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slideInRight {
                    animation: slideInRight 0.3s cubic-bezier(0.4,0,0.2,1) forwards;
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); }
                    to { transform: translateX(100%); }
                }
                .animate-slideOutRight {
                    animation: slideOutRight 0.3s cubic-bezier(0.4,0,0.2,1) forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s cubic-bezier(0.4,0,0.2,1) forwards;
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                .animate-fadeOut {
                    animation: fadeOut 0.3s cubic-bezier(0.4,0,0.2,1) forwards;
                }
            `}</style>
        </>
    );
};

export default GenericSidebar;
