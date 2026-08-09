import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { ChevronDown } from "lucide-react";
import Dropdown from "../../../components/Dropdown";
import { IRootState } from "../../../store";
import { toggleRTL } from "../../../store/themeConfigSlice";
import i18next from "i18next";

interface LanguageSelectorProps {
    isRtl: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ isRtl }) => {
    const dispatch = useDispatch();
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const [flag, setFlag] = React.useState(themeConfig.locale);

    const setLocale = (newFlag: string) => {
        setFlag(newFlag);
        if (newFlag.toLowerCase() === "ae") {
            dispatch(toggleRTL("rtl"));
        } else {
            dispatch(toggleRTL("ltr"));
        }
    };

    return (
        <div className="dropdown ms-auto w-max">
            <Dropdown
                offset={[0, 8]}
                placement={isRtl ? "bottom-start" : "bottom-end"}
                btnClassName="flex items-center gap-2.5 rounded-lg border border-white-dark/30 bg-white px-2 py-1.5 text-white-dark hover:border-primary hover:text-primary dark:bg-black"
                button={
                    <>
                        <div>
                            <img
                                src={`/assets/images/flags/${flag.toUpperCase()}.svg`}
                                alt="flag"
                                className="h-5 w-5 rounded-full object-cover"
                            />
                        </div>
                        <div className="text-base font-bold uppercase">
                            {flag}
                        </div>
                        <span className="shrink-0">
                            <ChevronDown />
                        </span>
                    </>
                }
            >
                <ul className="!px-2 text-dark dark:text-white-dark grid grid-cols-2 gap-2 font-semibold dark:text-white-light/90 w-[280px]">
                    {themeConfig.languageList.map((item: any) => (
                        <li key={item.code}>
                            <button
                                type="button"
                                className={`flex w-full hover:text-primary rounded-lg ${
                                    flag === item.code
                                        ? "bg-primary/10 text-primary"
                                        : ""
                                }`}
                                onClick={() => {
                                    i18next.changeLanguage(item.code);
                                    setLocale(item.code);
                                }}
                            >
                                <img
                                    src={`/assets/images/flags/${item.code.toUpperCase()}.svg`}
                                    alt="flag"
                                    className="w-5 h-5 object-cover rounded-full"
                                />
                                <span className="ltr:ml-3 rtl:mr-3">
                                    {item.name}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </Dropdown>
        </div>
    );
};

export default LanguageSelector;
