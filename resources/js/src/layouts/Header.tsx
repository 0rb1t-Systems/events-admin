import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import {
    HorizontalMenu,
    LanguageSwitcher,
    Logo,
    MessagesDropdown,
    QuickLinks,
    SearchBar,
    ThemeSwitcher,
    UserDropdown,
} from "../components/header";
import { useModal } from "../contexts/ModalContext";
import { IRootState } from "../store";

const Header = () => {
    const location = useLocation();
    const { t } = useTranslation();
    const { openModal } = useModal();
    const isRtl =
        useSelector((state: IRootState) => state.themeConfig.rtlClass) === "rtl"
            ? true
            : false;
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);

    useEffect(() => {
        const selector = document.querySelector(
            'ul.horizontal-menu a[href="' + window.location.pathname + '"]'
        );
        if (selector) {
            selector.classList.add("active");
            const all: any = document.querySelectorAll(
                "ul.horizontal-menu .nav-link.active"
            );
            for (let i = 0; i < all.length; i++) {
                all[0]?.classList.remove("active");
            }
            const ul: any = selector.closest("ul.sub-menu");
            if (ul) {
                let ele: any = ul
                    .closest("li.menu")
                    .querySelectorAll(".nav-link");
                if (ele) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele?.classList.add("active");
                    });
                }
            }
        }
    }, [location]);

    return (
        <header
            className={`z-[60] ${
                themeConfig.semidark && themeConfig.menu === "horizontal"
                    ? "dark"
                    : ""
            }`}
        >
            <div className="shadow-sm">
                <div className="relative bg-white flex w-full items-center px-5 py-2.5 dark:bg-black">
                    <Logo />
                    <QuickLinks onOpenModal={openModal} />

                    <div className="sm:flex-1 ltr:sm:ml-0 ltr:ml-auto sm:rtl:mr-0 rtl:mr-auto flex items-center space-x-1.5 lg:space-x-2 rtl:space-x-reverse dark:text-[#d0d2d6]">
                        <SearchBar />
                        <ThemeSwitcher />
                        <LanguageSwitcher />
                        <MessagesDropdown isRtl={isRtl} />
                        {/* <NotificationsDropdown isRtl={isRtl} /> */}
                        <UserDropdown isRtl={isRtl} />
                    </div>
                </div>

                {/* horizontal menu */}
                <HorizontalMenu />
            </div>
        </header>
    );
};

export default Header;
