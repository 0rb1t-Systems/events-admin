import React, { useState } from 'react';
import { ArrowLeft, Info, Mail, XCircle } from 'lucide-react';
import Dropdown from '../Dropdown';

interface MessageItem {
    id: number;
    image: string;
    title: string;
    message: string;
    time: string;
}

const MessagesDropdown = ({ isRtl }: { isRtl: boolean }) => {
    const [messages, setMessages] = useState<MessageItem[]>([
        {
            id: 1,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-success-light dark:bg-success text-success dark:text-success-light"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>',
            title: 'Congratulations!',
            message: 'Your OS has been updated.',
            time: '1hr',
        },
        {
            id: 2,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-info-light dark:bg-info text-info dark:text-info-light"><svg g xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>',
            title: 'Did you know?',
            message: 'You can switch between artboards.',
            time: '2hr',
        },
        {
            id: 3,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-danger-light dark:bg-danger text-danger dark:text-danger-light"> <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>',
            title: 'Something went wrong!',
            message: 'Send Reposrt',
            time: '2days',
        },
        {
            id: 4,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-warning-light dark:bg-warning text-warning dark:text-warning-light"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">    <circle cx="12" cy="12" r="10"></circle>    <line x1="12" y1="8" x2="12" y2="12"></line>    <line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>',
            title: 'Warning',
            message: 'Your password strength is low.',
            time: '5days',
        },
    ]);

    const removeMessage = (value: number) => {
        setMessages(messages.filter((user) => user.id !== value));
    };

    function createMarkup(message: string) {
        return { __html: message };
    }

    return (
        <div className="dropdown shrink-0">
            <Dropdown
                offset={[0, 8]}
                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                btnClassName="block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60"
                button={<Mail size={20} className="w-5 h-5" />}
            >
                <ul className="!py-0 text-dark dark:text-white-dark w-[300px] sm:w-[375px] text-xs">
                    <li className="mb-5" onClick={(e) => e.stopPropagation()}>
                        <div className="hover:!bg-transparent overflow-hidden relative rounded-t-md p-5 text-white w-full !h-[68px]">
                            <div
                                className="absolute h-full w-full bg-no-repeat bg-center bg-cover inset-0 bg-"
                                style={{
                                    backgroundImage: `url('/assets/images/menu-heade.jpg')`,
                                    backgroundRepeat: 'no-repeat',
                                    width: '100%',
                                    height: '100%',
                                }}
                            ></div>
                            <h4 className="font-semibold relative z-10 text-lg">Messages</h4>
                        </div>
                    </li>
                    {messages.length > 0 ? (
                        <>
                            <li onClick={(e) => e.stopPropagation()}>
                                {messages.map((message) => {
                                    return (
                                        <div key={message.id} className="flex items-center py-3 px-5">
                                            <div dangerouslySetInnerHTML={createMarkup(message.image)}></div>
                                            <span className="px-3 dark:text-gray-500">
                                                <div className="font-semibold text-sm dark:text-white-light/90">{message.title}</div>
                                                <div>{message.message}</div>
                                            </span>
                                            <span className="font-semibold bg-white-dark/20 rounded text-dark/60 px-1 ltr:ml-auto rtl:mr-auto whitespace-pre dark:text-white-dark ltr:mr-2 rtl:ml-2">
                                                {message.time}
                                            </span>
                                            <button type="button" className="text-neutral-300 hover:text-danger" onClick={() => removeMessage(message.id)}>
                                                <XCircle size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </li>
                            <li className="border-t border-white-light text-center dark:border-white/10 mt-5">
                                <button type="button" className="text-primary font-semibold group dark:text-gray-400 justify-center !py-4 !h-[48px]">
                                    <span className="group-hover:underline ltr:mr-1 rtl:ml-1">VIEW ALL ACTIVITIES</span>
                                    <ArrowLeft size={16} className="group-hover:translate-x-1 transition duration-300 ltr:ml-1 rtl:mr-1" />
                                </button>
                            </li>
                        </>
                    ) : (
                        <li className="mb-5" onClick={(e) => e.stopPropagation()}>
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

export default MessagesDropdown;
