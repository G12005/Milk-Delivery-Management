'use client';

/**
 * Minimal SVG icon components — replaces all emoji usage across the app.
 * Each icon accepts optional size (default 20) and className props.
 */

const defaultProps = { size: 20, className: '' };

const svg = (d, { size = 20, className = '', viewBox = '0 0 24 24', stroke = true } = {}) => (
    <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke={stroke ? 'currentColor' : 'none'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={{ flexShrink: 0 }}
    >
        {d}
    </svg>
);

// ─── Navigation / Section Icons ─────────────────────────────────────
export const IconDashboard = (props) => svg(
    <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="4" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1.5" />
    </>,
    props
);

export const IconUsers = (props) => svg(
    <>
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
    </>,
    props
);

export const IconClipboard = (props) => svg(
    <>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <line x1="8" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="12" y2="18" />
    </>,
    props
);

export const IconMap = (props) => svg(
    <>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
    </>,
    props
);

export const IconTruck = (props) => svg(
    <>
        <path d="M1 3h15v13H1z" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
    </>,
    props
);

export const IconPackage = (props) => svg(
    <>
        <path d="M16.5 9.4l-9-5.19" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
    </>,
    props
);

export const IconMilk = (props) => svg(
    <>
        <path d="M8 2h8l2 4v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6l2-4z" />
        <path d="M6 12h12" />
        <path d="M6 6h12" />
    </>,
    props
);

export const IconBarChart = (props) => svg(
    <>
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
    </>,
    props
);

export const IconFactory = (props) => svg(
    <>
        <path d="M2 20h20" />
        <path d="M5 20V8l4 3V4l4 3V4l4 3v4h1a2 2 0 0 1 2 2v7" />
        <path d="M3 20v-6a1 1 0 0 1 1-1h1" />
    </>,
    props
);

export const IconReceipt = (props) => svg(
    <>
        <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="12" y2="16" />
    </>,
    props
);

export const IconCreditCard = (props) => svg(
    <>
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
    </>,
    props
);

export const IconBank = (props) => svg(
    <>
        <path d="M3 21h18" />
        <path d="M3 10h18" />
        <path d="M12 3l9 7H3l9-7z" />
        <line x1="5" y1="10" x2="5" y2="21" />
        <line x1="9" y1="10" x2="9" y2="21" />
        <line x1="15" y1="10" x2="15" y2="21" />
        <line x1="19" y1="10" x2="19" y2="21" />
    </>,
    props
);

// ─── Action Icons ────────────────────────────────────────────────────
export const IconEdit = (props) => svg(
    <>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>,
    props
);

export const IconTrash = (props) => svg(
    <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
    </>,
    props
);

export const IconEye = (props) => svg(
    <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </>,
    props
);

export const IconChevronUp = (props) => svg(
    <polyline points="18 15 12 9 6 15" />,
    props
);

export const IconChevronDown = (props) => svg(
    <polyline points="6 9 12 15 18 9" />,
    props
);

export const IconPlus = (props) => svg(
    <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </>,
    props
);

export const IconCheck = (props) => svg(
    <polyline points="20 6 9 17 4 12" />,
    props
);

export const IconX = (props) => svg(
    <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </>,
    props
);

export const IconLoader = (props) => svg(
    <>
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </>,
    props
);

export const IconZap = (props) => svg(
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    props
);

export const IconWallet = (props) => svg(
    <>
        <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
        <path d="M16 12h5v4h-5a2 2 0 0 1 0-4z" />
    </>,
    props
);

export const IconSquare = (props) => svg(
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />,
    props
);

export const IconCheckSquare = (props) => svg(
    <>
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>,
    props
);

export const IconMenu = (props) => svg(
    <>
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </>,
    props
);

export const IconSearch = (props) => svg(
    <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>,
    props
);
