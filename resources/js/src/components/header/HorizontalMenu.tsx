import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import {
    ChevronDown,
    LayoutDashboard,
    LayoutGrid,
    Layers,
    FileText,
    Database,
    AlignLeft,
    MoreHorizontal
} from 'lucide-react';

const HorizontalMenu = () => {
    const { t } = useTranslation();

    return (
        <ul className="horizontal-menu hidden py-1.5 font-semibold px-6 lg:space-x-1.5 xl:space-x-8 rtl:space-x-reverse bg-white border-t border-[#ebedf2] dark:border-[#191e3a] dark:bg-black text-black dark:text-white-dark">
            <li className="menu nav-item relative">
                <button type="button" className="nav-link">
                    <div className="flex items-center">
                        <LayoutDashboard size={18} className="shrink-0" />
                        <span className="px-1">{t('dashboard')}</span>
                    </div>
                    <div className="right_arrow">
                        <ChevronDown size={16} />
                    </div>
                </button>
                <ul className="sub-menu">
                    <li>
                        <NavLink to="/">{t('sales')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/analytics">{t('analytics')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/finance">{t('finance')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/crypto">{t('crypto')}</NavLink>
                    </li>
                </ul>
            </li>
            <li className="menu nav-item relative">
                <button type="button" className="nav-link">
                    <div className="flex items-center">
                        <LayoutGrid size={18} className="shrink-0" />
                        <span className="px-1">{t('apps')}</span>
                    </div>
                    <div className="right_arrow">
                        <ChevronDown size={16} />
                    </div>
                </button>
                <ul className="sub-menu">
                    <li>
                        <NavLink to="/apps/chat">{t('chat')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/apps/mailbox">{t('mailbox')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/apps/todolist">{t('todo_list')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/apps/notes">{t('notes')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/apps/scrumboard">{t('scrumboard')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/apps/contacts">{t('contacts')}</NavLink>
                    </li>
                    <li className="relative">
                        <button type="button">
                            {t('invoice')}
                            <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                <ChevronDown size={16} />
                            </div>
                        </button>
                        <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                            <li>
                                <NavLink to="/apps/invoice/list">{t('list')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/apps/invoice/preview">{t('preview')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/apps/invoice/add">{t('add')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/apps/invoice/edit">{t('edit')}</NavLink>
                            </li>
                        </ul>
                    </li>
                    <li>
                        <NavLink to="/apps/calendar">{t('calendar')}</NavLink>
                    </li>
                </ul>
            </li>
            <li className="menu nav-item relative">
                <button type="button" className="nav-link">
                    <div className="flex items-center">
                        <Layers size={18} className="shrink-0" />
                        <span className="px-1">{t('components')}</span>
                    </div>
                    <div className="right_arrow">
                        <ChevronDown size={16} />
                    </div>
                </button>
                <ul className="sub-menu">
                    <li>
                        <NavLink to="/components/tabs">{t('tabs')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/components/accordions">{t('accordions')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/components/modals">{t('modals')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/components/cards">{t('cards')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/components/carousel">{t('carousel')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/components/countdown">{t('countdown')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/components/counter">{t('counter')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/components/sweetalert">{t('sweet_alerts')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/components/timeline">{t('timeline')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/components/notifications">{t('notifications')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/components/media-object">{t('media_object')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/components/list-group">{t('list_group')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/components/pricing-table">{t('pricing_tables')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/components/lightbox">{t('lightbox')}</NavLink>
                    </li>
                </ul>
            </li>
            <li className="menu nav-item relative">
                <button type="button" className="nav-link">
                    <div className="flex items-center">
                        <FileText size={18} className="shrink-0" />
                        <span className="px-1">{t('elements')}</span>
                    </div>
                    <div className="right_arrow">
                        <ChevronDown size={16} />
                    </div>
                </button>
                <ul className="sub-menu">
                    <li>
                        <NavLink to="/elements/alerts">{t('alerts')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/avatar">{t('avatar')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/badges">{t('badges')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/breadcrumbs">{t('breadcrumbs')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/buttons">{t('buttons')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/buttons-group">{t('button_groups')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/color-library">{t('color_library')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/dropdown">{t('dropdown')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/infobox">{t('infobox')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/jumbotron">{t('jumbotron')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/loader">{t('loader')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/pagination">{t('pagination')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/popovers">{t('popovers')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/progress-bar">{t('progress_bar')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/search">{t('search')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/tooltips">{t('tooltips')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/treeview">{t('treeview')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/elements/typography">{t('typography')}</NavLink>
                    </li>
                </ul>
            </li>
            <li className="menu nav-item relative">
                <button type="button" className="nav-link">
                    <div className="flex items-center">
                        <Database size={18} className="shrink-0" />
                        <span className="px-1">{t('tables')}</span>
                    </div>
                    <div className="right_arrow">
                        <ChevronDown size={16} />
                    </div>
                </button>
                <ul className="sub-menu">
                    <li>
                        <NavLink to="/tables">{t('tables')}</NavLink>
                    </li>
                    <li className="relative">
                        <button type="button">
                            {t('datatables')}
                            <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                <ChevronDown size={16} />
                            </div>
                        </button>
                        <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                            <li>
                                <NavLink to="/datatables/basic">{t('basic')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/datatables/advanced">{t('advanced')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/datatables/skin">{t('skin')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/datatables/order-sorting">{t('order_sorting')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/datatables/multi-column">{t('multi_column')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/datatables/multiple-tables">{t('multiple_tables')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/datatables/alt-pagination">{t('alt_pagination')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/datatables/checkbox">{t('checkbox')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/datatables/range-search">{t('range_search')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/datatables/export">{t('export')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/datatables/column-chooser">{t('column_chooser')}</NavLink>
                            </li>
                        </ul>
                    </li>
                </ul>
            </li>
            <li className="menu nav-item relative">
                <button type="button" className="nav-link">
                    <div className="flex items-center">
                        <AlignLeft size={18} className="shrink-0" />
                        <span className="px-1">{t('forms')}</span>
                    </div>
                    <div className="right_arrow">
                        <ChevronDown size={16} />
                    </div>
                </button>
                <ul className="sub-menu">
                    <li>
                        <NavLink to="/forms/basic">{t('basic')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/input-group">{t('input_group')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/layouts">{t('layouts')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/validation">{t('validation')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/input-mask">{t('input_mask')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/select2">{t('select2')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/touchspin">{t('touchspin')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/checkbox-radio">{t('checkbox_and_radio')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/switches">{t('switches')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/wizards">{t('wizards')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/file-upload">{t('file_upload')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/quill-editor">{t('quill_editor')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/markdown-editor">{t('markdown_editor')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/date-picker">{t('date_and_range_picker')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/forms/clipboard">{t('clipboard')}</NavLink>
                    </li>
                </ul>
            </li>
            <li className="menu nav-item relative">
                <button type="button" className="nav-link">
                    <div className="flex items-center">
                        <FileText size={18} className="shrink-0" />
                        <span className="px-1">{t('pages')}</span>
                    </div>
                    <div className="right_arrow">
                        <ChevronDown size={16} />
                    </div>
                </button>
                <ul className="sub-menu">
                    <li className="relative">
                        <button type="button">
                            {t('users')}
                            <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                <ChevronDown size={16} />
                            </div>
                        </button>
                        <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                            <li>
                                <NavLink to="/users/profile">{t('profile')}</NavLink>
                            </li>
                            <li>
                                <NavLink to="/users/user-account-settings">{t('account_settings')}</NavLink>
                            </li>
                        </ul>
                    </li>
                    <li>
                        <NavLink to="/pages/knowledge-base">{t('knowledge_base')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/pages/contact-us-boxed" target="_blank">
                            {t('contact_us_boxed')}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/pages/contact-us-cover" target="_blank">
                            {t('contact_us_cover')}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/pages/faq">{t('faq')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/pages/coming-soon-boxed" target="_blank">
                            {t('coming_soon_boxed')}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/pages/coming-soon-cover" target="_blank">
                            {t('coming_soon_cover')}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/pages/maintenence" target="_blank">
                            {t('maintenence')}
                        </NavLink>
                    </li>
                    <li className="relative">
                        <button type="button">
                            {t('error')}
                            <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                <ChevronDown size={16} />
                            </div>
                        </button>
                        <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                            <li>
                                <NavLink to="/pages/error404" target="_blank">
                                    {t('404')}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/pages/error500" target="_blank">
                                    {t('500')}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/pages/error503" target="_blank">
                                    {t('503')}
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="relative">
                        <button type="button">
                            {t('login')}
                            <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                <ChevronDown size={16} />
                            </div>
                        </button>
                        <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                            <li>
                                <NavLink to="/auth/cover-login" target="_blank">
                                    {t('login_cover')}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/auth/login" target="_blank">
                                    {t('login_boxed')}
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="relative">
                        <button type="button">
                            {t('register')}
                            <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                <ChevronDown size={16} />
                            </div>
                        </button>
                        <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                            <li>
                                <NavLink to="/auth/cover-register" target="_blank">
                                    {t('register_cover')}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/auth/boxed-signup" target="_blank">
                                    {t('register_boxed')}
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="relative">
                        <button type="button">
                            {t('password_recovery')}
                            <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                <ChevronDown size={16} />
                            </div>
                        </button>
                        <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                            <li>
                                <NavLink to="/auth/cover-password-reset" target="_blank">
                                    {t('recover_id_cover')}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/auth/boxed-password-reset" target="_blank">
                                    {t('recover_id_boxed')}
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="relative">
                        <button type="button">
                            {t('lockscreen')}
                            <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-90 -rotate-90">
                                <ChevronDown size={16} />
                            </div>
                        </button>
                        <ul className="rounded absolute top-0 ltr:left-[95%] rtl:right-[95%] min-w-[180px] bg-white z-[10] text-dark dark:text-white-dark dark:bg-[#1b2e4b] shadow p-0 py-2 hidden">
                            <li>
                                <NavLink to="/auth/cover-lockscreen" target="_blank">
                                    {t('unlock_cover')}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/auth/boxed-lockscreen" target="_blank">
                                    {t('unlock_boxed')}
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                </ul>
            </li>
            <li className="menu nav-item relative">
                <button type="button" className="nav-link">
                    <div className="flex items-center">
                        <MoreHorizontal size={18} className="shrink-0" />
                        <span className="px-1">{t('more')}</span>
                    </div>
                    <div className="right_arrow">
                        <ChevronDown size={16} />
                    </div>
                </button>
                <ul className="sub-menu">
                    <li>
                        <NavLink to="/dragndrop">{t('drag_and_drop')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/charts">{t('charts')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/font-icons">{t('font_icons')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="/widgets">{t('widgets')}</NavLink>
                    </li>
                    <li>
                        <NavLink to="https://vristo.sbthemes.com" target="_blank">
                            {t('documentation')}
                        </NavLink>
                    </li>
                </ul>
            </li>
        </ul>
    );
};

export default HorizontalMenu;
