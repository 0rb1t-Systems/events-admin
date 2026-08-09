import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";

// Perfect Scrollbar
import "react-perfect-scrollbar/dist/css/styles.css";

// Tailwind css
import "./tailwind.css";

// i18n (needs to be bundled)
import "./i18n";

//  Router
import { RouterProvider } from "react-router-dom";
import router from "./router/index";

// Redux
import { Provider } from "react-redux";
import store from "./store/index";

// React Query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Modal Context
import { ModalProvider } from "./contexts/ModalContext";

// Organization Context
import { OrganizationProvider } from "./contexts/OrganizationContext";

// Axios configuration
import { setReduxStoreGetter } from "./utils/axios";

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

// Provide Redux store getter to axios
setReduxStoreGetter(() => store.getState());

const root = ReactDOM.createRoot(document.getElementById("app")!);
root.render(
    <React.StrictMode>
        <Suspense>
            <Provider store={store}>
                <QueryClientProvider client={queryClient}>
                    <ModalProvider>
                        <OrganizationProvider>
                            <RouterProvider router={router} />
                        </OrganizationProvider>
                    </ModalProvider>
                </QueryClientProvider>
            </Provider>
        </Suspense>
    </React.StrictMode>
);
