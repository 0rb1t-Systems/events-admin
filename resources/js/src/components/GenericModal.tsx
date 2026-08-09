import React, { Fragment, ReactNode } from "react";
import {
    Transition,
    Dialog,
    DialogPanel,
    TransitionChild,
} from "@headlessui/react";
import { X } from "lucide-react";

interface GenericModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    title: string;
    children: ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
}

const GenericModal: React.FC<GenericModalProps> = ({
    isOpen,
    setIsOpen,
    title,
    children,
    maxWidth = "lg",
}) => {
    const handleClose = () => {
        setIsOpen(false);
    };

    const maxWidthClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
        full: "max-w-full",
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[999]" onClose={() => {}}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-150"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-screen items-start justify-center px-4">
                        <DialogPanel
                            className={`panel w-full ${maxWidthClasses[maxWidth]} my-8 p-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-[#232a3b] text-black dark:text-gray-100 bg-white dark:bg-[#1a2236] shadow-lg dark:shadow-[0_8px_32px_0_rgba(10,20,50,0.85)] animate__animated animate__slideInDown animate__faster`}
                        >
                            <div className="flex items-center justify-between px-5 py-3 bg-[#fbfbfb] dark:bg-[#232a3b] border-b border-gray-200 dark:border-[#232a3b]">
                                <h5 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                                    {title}
                                </h5>
                                <button
                                    onClick={handleClose}
                                    type="button"
                                    className="text-gray-400 hover:text-red-400 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-150"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-5 bg-white dark:bg-[#202940]">
                                {children}
                            </div>
                        </DialogPanel>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default GenericModal;
