import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, LogOut, Mail, User } from "lucide-react";
import { useSelector } from "react-redux";
import Dropdown from "../Dropdown";
import { useLogout } from "../../hooks/useAuth";
import { IRootState } from "../../store";
import { getImageUrl } from "../../utils/images";
import LockConfirmationModal from "../modals/LockConfirmationModal";

const UserDropdown = ({ isRtl }: { isRtl: boolean }) => {
    const { user } = useSelector((state: IRootState) => state.auth);
    const logoutMutation = useLogout();
    const [showLockModal, setShowLockModal] = useState(false);

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        logoutMutation.mutate();
    };

    const handleLockClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowLockModal(true);
    };

    return (
        <>
            <div className="dropdown shrink-0 flex">
                <Dropdown
                    offset={[0, 8]}
                    placement={`${isRtl ? "bottom-start" : "bottom-end"}`}
                    btnClassName="relative group block"
                    button={
                        <img
                            className="w-9 h-9 rounded-full object-cover saturate-50 group-hover:saturate-100"
                            src={getImageUrl(user?.profile_image)}
                            alt="userProfile"
                        />
                    }
                >
                    <ul className="text-dark dark:text-white-dark !py-0 w-[230px] font-semibold dark:text-white-light/90">
                        <li>
                            <div className="flex items-center px-4 py-4">
                                <img
                                    className="rounded-md w-10 h-10 object-cover"
                                    src={getImageUrl(user?.profile_image)}
                                    alt="userProfile"
                                />
                                <div className="ltr:pl-4 rtl:pr-4 truncate">
                                    <h4 className="text-base">
                                        {user?.name}
                                        <span className="text-xs bg-success-light rounded text-success px-1 ltr:ml-2 rtl:ml-2">
                                            Admin
                                        </span>
                                    </h4>
                                    <button
                                        type="button"
                                        className="text-black/60 hover:text-primary dark:text-dark-light/60 dark:hover:text-white"
                                    >
                                        {user?.email}
                                    </button>
                                </div>
                            </div>
                        </li>
                        <li>
                            <Link
                                to="/auth/profile"
                                className="dark:hover:text-white"
                            >
                                <User
                                    size={18}
                                    className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 shrink-0"
                                />
                                Profile
                            </Link>
                        </li>

                        <li>
                            <button
                                onClick={handleLockClick}
                                className="dark:hover:text-white w-full text-left"
                            >
                                <Lock
                                    size={18}
                                    className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 shrink-0"
                                />
                                Lock Screen
                            </button>
                        </li>
                        <li className="border-t border-white-light dark:border-white-light/10">
                            <button
                                onClick={handleLogout}
                                className="text-danger !py-3 flex w-full items-center"
                                disabled={logoutMutation.isPending}
                            >
                                <LogOut
                                    size={18}
                                    className="w-4.5 h-4.5 ltr:mr-2 rtl:ml-2 rotate-90 shrink-0"
                                />
                                {logoutMutation.isPending
                                    ? "Logging out..."
                                    : "Logout"}
                            </button>
                        </li>
                    </ul>
                </Dropdown>
            </div>

            {/* Lock Confirmation Modal */}
            <LockConfirmationModal
                isOpen={showLockModal}
                onClose={() => setShowLockModal(false)}
            />
        </>
    );
};

export default UserDropdown;
