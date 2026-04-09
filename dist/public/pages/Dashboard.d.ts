import './Dashboard.css';
interface SystemHealth {
    status: string;
    timestamp: string;
    services: any;
}
export default function Dashboard({ systemHealth }: {
    systemHealth: SystemHealth | null;
}): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Dashboard.d.ts.map