import React, { createContext, useContext, useState, ReactNode } from "react";

interface ModalContextType {
    openModal: (modalType: string) => void;
    closeModal: () => void;
    currentModal: string | null;
    isModalOpen: boolean;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

interface ModalProviderProps {
    children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
    const [currentModal, setCurrentModal] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = (modalType: string) => {
        setCurrentModal(modalType);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setCurrentModal(null);
        setIsModalOpen(false);
    };

    return (
        <ModalContext.Provider
            value={{
                openModal,
                closeModal,
                currentModal,
                isModalOpen,
            }}
        >
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = (): ModalContextType => {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error("useModal must be used within a ModalProvider");
    }
    return context;
};
