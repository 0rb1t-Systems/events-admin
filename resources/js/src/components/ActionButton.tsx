import React, { FC, ReactNode } from "react";
import Spinner from "./Spinner";

interface ActionButtonProps {
    type: "button" | "submit";
    variant: "primary" | "outline-danger" | "success" | "warning" | "info" | string;
    onClick?: () => void;
    isLoading?: boolean;
    loadingText?: string;
    displayText: React.ReactNode;
    disabled?: boolean;
    className?: string;
    iconLeft?: ReactNode;
    iconRight?: ReactNode;
    size?: number;
}

const ActionButton: FC<ActionButtonProps> = ({
    type,
    variant,
    onClick,
    isLoading = false,
    loadingText = "Loading...",
    displayText,
    disabled = false,
    className = "",
    iconLeft,
    iconRight,
    size = 20,
}) => {
    const baseClass = `btn btn-${variant}`;
    const fullClassName = className ? `${baseClass} ${className}` : baseClass;
    const isDisabled = disabled || isLoading;

    return (
        <button
            type={type}
            className={fullClassName}
            onClick={onClick}
            disabled={isDisabled}
        >
            {isLoading ? (
                <Spinner size={size} text={loadingText} />
            ) : (
                <>
                    {iconLeft && <span className="mr-2">{iconLeft}</span>}
                    {displayText}
                    {iconRight && <span className="ml-2">{iconRight}</span>}
                </>
            )}
        </button>
    );
};

export default ActionButton;
