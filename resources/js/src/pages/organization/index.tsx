import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Building2, Upload, X } from 'lucide-react';
import Breadcrumb from '../../components/Breadcrumb';
import { organizationApi } from '../../services/organization';
import { toast } from 'sonner';
import { useOrganization, Organization } from '../../contexts/OrganizationContext';

type OrganizationData = Organization;

const validationSchema = Yup.object({
    name: Yup.string().required('Organization name is required'),
    founded_date: Yup.date().nullable(),
    website_url: Yup.string().url('Must be a valid URL').nullable(),
    email: Yup.string().email('Must be a valid email').nullable(),
    phone: Yup.string().nullable(),
    address: Yup.string().nullable(),
    city: Yup.string().nullable(),
    postal_code: Yup.string().nullable(),
    country: Yup.string().nullable(),
});

const OrganizationPage: React.FC = () => {
    const { organization, setOrganization, updateOrganizationLogo, removeOrganizationLogo, updateOrganizationDarkLogo, removeOrganizationDarkLogo, updateOrganizationIcon, removeOrganizationIcon } = useOrganization();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingDarkLogo, setUploadingDarkLogo] = useState(false);
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const [localOrganization, setLocalOrganization] = useState<OrganizationData | null>(null);

    const formik = useFormik<OrganizationData>({
        initialValues: {
            name: '',
            founded_date: '',
            logo_url: '',
            logo_dark_url: '',
            icon_url: '',
            website_url: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            postal_code: '',
            country: '',
        },
        validationSchema,
                onSubmit: async (values) => {
            setSaving(true);
            try {
                const response = await organizationApi.updateProfile(values);
                setLocalOrganization(response);
                setOrganization(response);
                toast.success('Organization profile updated successfully!');
            } catch (error: any) {
                toast.error(error.message || 'Failed to update organization profile');
            } finally {
                setSaving(false);
            }
        },
    });

    useEffect(() => {
        loadOrganization();
    }, []);

    const loadOrganization = async () => {
        try {
            const response = await organizationApi.getProfile();
            setLocalOrganization(response);
            setOrganization(response);

            // Update form values
            formik.setValues({
                name: response.name || '',
                founded_date: response.founded_date || '',
                logo_url: response.logo_url || '',
                logo_dark_url: response.logo_dark_url || '',
                icon_url: response.icon_url || '',
                website_url: response.website_url || '',
                email: response.email || '',
                phone: response.phone || '',
                address: response.address || '',
                city: response.city || '',
                postal_code: response.postal_code || '',
                country: response.country || '',
            });
        } catch (error: any) {
            toast.error(error.message || 'Failed to load organization profile');
        } finally {
            setLoading(false);
        }
    };

        const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingLogo(true);

        try {
            const formData = new FormData();
            formData.append('logo', file);

            const response = await organizationApi.uploadLogo(formData);
            formik.setFieldValue('logo_url', response.logo_url);
            updateOrganizationLogo(response.logo_url);
            toast.success('Logo uploaded successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload logo');
        } finally {
            setUploadingLogo(false);
        }
    };

        const handleRemoveLogo = async () => {
        try {
            await organizationApi.removeLogo();
            formik.setFieldValue('logo_url', '');
            removeOrganizationLogo();
            toast.success('Logo removed successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove logo');
        }
    };

    const handleDarkLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingDarkLogo(true);

        try {
            const formData = new FormData();
            formData.append('logo', file);

            const response = await organizationApi.uploadDarkLogo(formData);
            formik.setFieldValue('logo_dark_url', response.logo_dark_url);
            updateOrganizationDarkLogo(response.logo_dark_url);
            toast.success('Dark logo uploaded successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload dark logo');
        } finally {
            setUploadingDarkLogo(false);
        }
    };

    const handleRemoveDarkLogo = async () => {
        try {
            await organizationApi.removeDarkLogo();
            formik.setFieldValue('logo_dark_url', '');
            removeOrganizationDarkLogo();
            toast.success('Dark logo removed successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove dark logo');
        }
    };

    const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingIcon(true);

        try {
            const formData = new FormData();
            formData.append('icon', file);

            const response = await organizationApi.uploadIcon(formData);
            formik.setFieldValue('icon_url', response.icon_url);
            updateOrganizationIcon(response.icon_url);
            toast.success('Favicon uploaded successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload favicon');
        } finally {
            setUploadingIcon(false);
        }
    };

    const handleRemoveIcon = async () => {
        try {
            await organizationApi.removeIcon();
            formik.setFieldValue('icon_url', '');
            removeOrganizationIcon();
            toast.success('Favicon removed successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove favicon');
        }
    };

    const breadcrumbItems = [
        { title: "Dashboard", path: "/" },
        { title: "Settings", path: "/settings" },
        { title: "Organization" },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div>
            <Breadcrumb items={breadcrumbItems} />
            <div className="mt-5">
                <div className="panel w-full">
                    <div className="mb-6">
                        <h5 className="font-semibold text-xl dark:text-white-light flex items-center">
                            <Building2 className="w-5 h-5 mr-2" />
                            Organization Profile
                        </h5>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Manage your organization information
                        </p>
                    </div>

                    <form onSubmit={formik.handleSubmit} className="space-y-6 w-full">
                            {/* Basic Information */}
                            <div className="panel">
                                <div className="mb-4">
                                    <h6 className="text-lg font-semibold">Basic Information</h6>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="name" className="form-label">
                                            Organization Name *
                                        </label>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            className={`form-input ${formik.touched.name && formik.errors.name ? 'border-red-500' : ''}`}
                                            value={formik.values.name}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                        />
                                        {formik.touched.name && formik.errors.name && (
                                            <div className="text-red-500 text-sm mt-1">{formik.errors.name}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="founded_date" className="form-label">
                                            Founded Date
                                        </label>
                                        <input
                                            id="founded_date"
                                            name="founded_date"
                                            type="date"
                                            className="form-input"
                                            value={formik.values.founded_date}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="website_url" className="form-label">
                                            Website URL
                                        </label>
                                        <input
                                            id="website_url"
                                            name="website_url"
                                            type="url"
                                            className={`form-input ${formik.touched.website_url && formik.errors.website_url ? 'border-red-500' : ''}`}
                                            placeholder="https://example.com"
                                            value={formik.values.website_url}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                        />
                                        {formik.touched.website_url && formik.errors.website_url && (
                                            <div className="text-red-500 text-sm mt-1">{formik.errors.website_url}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        {/* Logo Uploads */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Logo Upload */}
                            <div className="panel">
                                <div className="mb-4">
                                    <h6 className="text-lg font-semibold">Organization Logo</h6>
                                    <p className="text-sm text-gray-500">Upload your organization's logo for branding</p>
                                </div>
                                <div className="space-y-4">
                                    {formik.values.logo_url ? (
                                        <div className="space-y-4">
                                            {/* Logo Display */}
                                            <div className="flex flex-col items-center">
                                                <div className="relative group">
                                                    <div className="w-48 h-48 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-4 shadow-lg border-2 border-gray-200 hover:border-blue-300 transition-all duration-300">
                                                        <img
                                                            src={formik.values.logo_url}
                                                            alt="Organization Logo"
                                                            className="w-full h-full object-contain rounded-xl"
                                                        />
                                                    </div>
                                                    {/* Hover overlay with remove button */}
                                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-2xl transition-all duration-300 flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            className="btn btn-danger btn-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100 flex items-center gap-2"
                                                            onClick={handleRemoveLogo}
                                                        >
                                                            <X size={16} />
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Logo info */}
                                                <div className="text-center mt-3">
                                                    <p className="text-sm text-gray-600">Logo uploaded successfully</p>
                                                    <p className="text-xs text-gray-400 mt-1">Click to replace or use remove button</p>
                                                </div>

                                                {/* Replace logo button */}
                                                <label htmlFor="logo-replace" className="btn btn-outline-primary btn-sm mt-2 cursor-pointer">
                                                    <Upload size={16} className="mr-2" />
                                                    Replace Logo
                                                    <input
                                                        id="logo-replace"
                                                        name="logo"
                                                        type="file"
                                                        className="sr-only"
                                                        accept="image/*"
                                                        onChange={handleLogoUpload}
                                                        disabled={uploadingLogo}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 hover:border-blue-400 hover:from-blue-50 hover:to-indigo-50 transition-all duration-300">
                                            <div className="space-y-4">
                                                <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <Building2 className="h-10 w-10 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-medium text-gray-900 mb-2">Upload Organization Logo</h4>
                                                    <p className="text-gray-600 mb-4">Add your organization's logo to personalize your system</p>
                                                    <label htmlFor="logo-upload" className="btn btn-primary cursor-pointer">
                                                        <Upload size={18} className="mr-2" />
                                                        Choose Logo File
                                                        <input
                                                            id="logo-upload"
                                                            name="logo"
                                                            type="file"
                                                            className="sr-only"
                                                            accept="image/*"
                                                            onChange={handleLogoUpload}
                                                            disabled={uploadingLogo}
                                                        />
                                                    </label>
                                                </div>
                                                <div className="text-xs text-gray-500 space-y-1">
                                                    <p>Supported formats: PNG, JPG, GIF, SVG</p>
                                                    <p>Maximum file size: 2MB</p>
                                                    <p>Recommended size: 512x512 pixels</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Upload progress */}
                                    {uploadingLogo && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                <div>
                                                    <p className="text-sm font-medium text-blue-900">Uploading logo...</p>
                                                    <p className="text-xs text-blue-700">Please wait while we process your logo</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Dark Logo Upload */}
                            <div className="panel">
                                <div className="mb-4">
                                    <h6 className="text-lg font-semibold">Dark Mode Logo</h6>
                                    <p className="text-sm text-gray-500">Upload logo for dark theme (optional)</p>
                                </div>
                                <div className="space-y-4">
                                    {formik.values.logo_dark_url ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-col items-center">
                                                <div className="relative group">
                                                    <div className="w-48 h-48 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-4 shadow-lg border-2 border-gray-700 hover:border-gray-600 transition-all duration-300">
                                                        <img
                                                            src={formik.values.logo_dark_url}
                                                            alt="Dark Mode Logo"
                                                            className="w-full h-full object-contain rounded-xl"
                                                        />
                                                    </div>
                                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-2xl transition-all duration-300 flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            className="btn btn-danger btn-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100 flex items-center gap-2"
                                                            onClick={handleRemoveDarkLogo}
                                                        >
                                                            <X size={16} />
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                                <label htmlFor="dark-logo-replace" className="btn btn-outline-primary btn-sm mt-2 cursor-pointer">
                                                    <Upload size={16} className="mr-2" />
                                                    Replace Dark Logo
                                                    <input
                                                        id="dark-logo-replace"
                                                        name="dark_logo"
                                                        type="file"
                                                        className="sr-only"
                                                        accept="image/*"
                                                        onChange={handleDarkLogoUpload}
                                                        disabled={uploadingDarkLogo}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 hover:border-blue-400 hover:from-blue-50 hover:to-indigo-50 transition-all duration-300">
                                            <div className="space-y-4">
                                                <div className="mx-auto w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center">
                                                    <Building2 className="h-10 w-10 text-gray-300" />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-medium text-gray-900 mb-2">Upload Dark Mode Logo</h4>
                                                    <p className="text-gray-600 mb-4">Add a logo optimized for dark theme</p>
                                                    <label htmlFor="dark-logo-upload" className="btn btn-primary cursor-pointer">
                                                        <Upload size={18} className="mr-2" />
                                                        Choose Dark Logo File
                                                        <input
                                                            id="dark-logo-upload"
                                                            name="dark_logo"
                                                            type="file"
                                                            className="sr-only"
                                                            accept="image/*"
                                                            onChange={handleDarkLogoUpload}
                                                            disabled={uploadingDarkLogo}
                                                        />
                                                    </label>
                                                </div>
                                                <div className="text-xs text-gray-500 space-y-1">
                                                    <p>Supported formats: PNG, JPG, GIF, SVG</p>
                                                    <p>Maximum file size: 2MB</p>
                                                    <p>Recommended size: 512x512 pixels</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {uploadingDarkLogo && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                <div>
                                                    <p className="text-sm font-medium text-blue-900">Uploading dark logo...</p>
                                                    <p className="text-xs text-blue-700">Please wait while we process your logo</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Favicon Upload */}
                            <div className="panel">
                                <div className="mb-4">
                                    <h6 className="text-lg font-semibold">Favicon</h6>
                                    <p className="text-sm text-gray-500">Upload favicon for browser tab (optional)</p>
                                </div>
                                <div className="space-y-4">
                                    {formik.values.icon_url ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-col items-center">
                                                <div className="relative group">
                                                    <div className="w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-4 shadow-lg border-2 border-gray-200 hover:border-blue-300 transition-all duration-300">
                                                        <img
                                                            src={formik.values.icon_url}
                                                            alt="Favicon"
                                                            className="w-full h-full object-contain rounded-xl"
                                                        />
                                                    </div>
                                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-2xl transition-all duration-300 flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            className="btn btn-danger btn-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100 flex items-center gap-2"
                                                            onClick={handleRemoveIcon}
                                                        >
                                                            <X size={16} />
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                                <label htmlFor="icon-replace" className="btn btn-outline-primary btn-sm mt-2 cursor-pointer">
                                                    <Upload size={16} className="mr-2" />
                                                    Replace Favicon
                                                    <input
                                                        id="icon-replace"
                                                        name="icon"
                                                        type="file"
                                                        className="sr-only"
                                                        accept="image/*"
                                                        onChange={handleIconUpload}
                                                        disabled={uploadingIcon}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 hover:border-blue-400 hover:from-blue-50 hover:to-indigo-50 transition-all duration-300">
                                            <div className="space-y-4">
                                                <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <Building2 className="h-10 w-10 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-medium text-gray-900 mb-2">Upload Favicon</h4>
                                                    <p className="text-gray-600 mb-4">Add a favicon for browser tabs</p>
                                                    <label htmlFor="icon-upload" className="btn btn-primary cursor-pointer">
                                                        <Upload size={18} className="mr-2" />
                                                        Choose Favicon File
                                                        <input
                                                            id="icon-upload"
                                                            name="icon"
                                                            type="file"
                                                            className="sr-only"
                                                            accept="image/*"
                                                            onChange={handleIconUpload}
                                                            disabled={uploadingIcon}
                                                        />
                                                    </label>
                                                </div>
                                                <div className="text-xs text-gray-500 space-y-1">
                                                    <p>Supported formats: PNG, JPG, ICO, SVG</p>
                                                    <p>Maximum file size: 2MB</p>
                                                    <p>Recommended size: 32x32 or 64x64 pixels</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {uploadingIcon && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                <div>
                                                    <p className="text-sm font-medium text-blue-900">Uploading favicon...</p>
                                                    <p className="text-xs text-blue-700">Please wait while we process your favicon</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="panel">
                            <div className="mb-4">
                                <h6 className="text-lg font-semibold">Contact Information</h6>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="email" className="form-label">
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        className={`form-input ${formik.touched.email && formik.errors.email ? 'border-red-500' : ''}`}
                                        placeholder="contact@organization.com"
                                        value={formik.values.email}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                    {formik.touched.email && formik.errors.email && (
                                        <div className="text-red-500 text-sm mt-1">{formik.errors.email}</div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="phone" className="form-label">
                                        Phone Number
                                    </label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        className="form-input"
                                        placeholder="+1 (555) 123-4567"
                                        value={formik.values.phone}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address Information */}
                        <div className="panel">
                            <div className="mb-4">
                                <h6 className="text-lg font-semibold">Address Information</h6>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="address" className="form-label">
                                        Address
                                    </label>
                                    <textarea
                                        id="address"
                                        name="address"
                                        rows={3}
                                        className="form-textarea"
                                        placeholder="Enter full address"
                                        value={formik.values.address}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label htmlFor="city" className="form-label">
                                            City
                                        </label>
                                        <input
                                            id="city"
                                            name="city"
                                            type="text"
                                            className="form-input"
                                            value={formik.values.city}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="postal_code" className="form-label">
                                            Postal Code
                                        </label>
                                        <input
                                            id="postal_code"
                                            name="postal_code"
                                            type="text"
                                            className="form-input"
                                            value={formik.values.postal_code}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="country" className="form-label">
                                            Country
                                        </label>
                                        <input
                                            id="country"
                                            name="country"
                                            type="text"
                                            className="form-input"
                                            value={formik.values.country}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={saving || !formik.isValid}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OrganizationPage;
