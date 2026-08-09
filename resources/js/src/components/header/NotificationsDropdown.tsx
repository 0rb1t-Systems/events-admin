import React, { useState } from 'react';
import { Bell, Info, XCircle } from 'lucide-react';
import Dropdown from '../Dropdown';

interface NotificationItem {
    id: number;
    profile: string;
    message: string;
    time: string;
}

const NotificationsDropdown = ({ isRtl }: { isRtl: boolean }) => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([
        {
            id: 1,
            profile: 'user-profile.jpeg',
            message: '<strong className="text-sm mr-1">John Doe</strong>invite you to <strong>Prototyping</strong>',
            time: '45 min ago',
        },
        {
            id: 2,
            profile: 'profile-34.jpeg',
            message: '<strong className="text-sm mr-1">Adam Nolan</strong>mentioned you to <strong>UX Basics</strong>',
            time: '9h Ago',
        },
        {
            id: 3,
            profile: 'profile-16.jpeg',
            message: '<strong className="text-sm mr-1">Anna Morgan</strong>Upload a file',
            time: '9h Ago',
        },
    ]);

    const removeNotification = (value: number) => {
        setNotifications(notifications.filter((user) => user.id !== value));
    };

    function createMarkup(message: string) {
        return { __html: message };
    }

    return (
        <div className="dropdown shrink-0">
            <Dropdown
                offset={[0, 8]}
                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                btnClassName="relative block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60"
                button={
                    <span>
                        <Bell size={20} />
                        <span className="flex absolute w-3 h-3 ltr:right-0 rtl:left-0 top-0">
                            <span className="animate-ping absolute ltr:-left-[3px] rtl:-right-[3px] -top-[3px] inline-flex h-full w-full rounded-full bg-success/50 opacity-75"></span>
                            <span className="relative inline-flex rounded-full w-[6px] h-[6px] bg-success"></span>
                        </span>
                    </span>
                }
            >
                <ul className="!py-0 text-dark dark:text-white-dark w-[300px] sm:w-[350px] divide-y dark:divide-white/10">
                    <li onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center px-4 py-2 justify-between font-semibold">
                            <h4 className="text-lg">Notification</h4>
                            {notifications.length ? <span className="badge bg-primary/80">{notifications.length}New</span> : ''}
                        </div>
                    </li>
                    {notifications.length > 0 ? (
                        <>
                            {notifications.map((notification) => {
                                return (
                                    <li key={notification.id} className="dark:text-white-light/90" onClick={(e) => e.stopPropagation()}>
                                        <div className="group flex items-center px-4 py-2">
                                            <div className="grid place-content-center rounded">
                                                <div className="w-12 h-12 relative">
                                                    <img className="w-12 h-12 rounded-full object-cover" alt="profile" src={`/assets/images/${notification.profile}`} />
                                                    <span className="bg-success w-2 h-2 rounded-full block absolute right-[6px] bottom-0"></span>
                                                </div>
                                            </div>
                                            <div className="ltr:pl-3 rtl:pr-3 flex flex-auto">
                                                <div className="ltr:pr-3 rtl:pl-3">
                                                    <h6
                                                        dangerouslySetInnerHTML={{
                                                            __html: notification.message,
                                                        }}
                                                    ></h6>
                                                    <span className="text-xs block font-normal dark:text-gray-500">{notification.time}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="ltr:ml-auto rtl:mr-auto text-neutral-300 hover:text-danger opacity-0 group-hover:opacity-100"
                                                    onClick={() => removeNotification(notification.id)}
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                            <li>
                                <div className="p-4">
                                    <button className="btn btn-primary block w-full btn-small">Read All Notifications</button>
                                </div>
                            </li>
                        </>
                    ) : (
                        <li onClick={(e) => e.stopPropagation()}>
                            <button type="button" className="!grid place-content-center hover:!bg-transparent text-lg min-h-[200px]">
                                <div className="mx-auto ring-4 ring-primary/30 rounded-full mb-4 text-primary">
                                    <Info size={40} className="w-10 h-10" />
                                </div>
                                No data available.
                            </button>
                        </li>
                    )}
                </ul>
            </Dropdown>
        </div>
    );
};

export default NotificationsDropdown;
