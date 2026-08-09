import React from "react";

interface FormFileInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: string;
    error?: string;
}

const FormFileInput: React.FC<FormFileInputProps> = ({
    id,
    label,
    error,
    className = "",
    ...props
}) => {
    return (
        <div className="form-group">
            <label htmlFor={id} className="form-label">
                {label}
            </label>
            <input
                type="file"
                id={id}
                className={`form-control ${
                    error ? "is-invalid" : ""
                } ${className}`}
                {...props}
            />
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    );
};

export default FormFileInput;
