
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(__dirname, '../data/visits.json');

interface VisitData {
    total: number;
    ips: Record<string, number>; // IP -> timestamp of last visit
}

// Initialize file if not exists
if (!fs.existsSync(DATA_FILE)) {
    const initialData: VisitData = { total: 0, ips: {} };
    // Ensure directory exists
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

export const getVisits = (): number => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        return data.total || 0;
    } catch (error) {
        console.error('Error reading visits:', error);
        return 0;
    }
};

export const recordVisit = (ip: string): number => {
    try {
        const data: VisitData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        const now = Date.now();
        const lastVisit = data.ips[ip];

        // Check uniqueness strategy:
        // User requested: "si yo entro 100 vece snoq uiero q me registre a mi 100 vece"
        // This implies permanent uniqueness OR session uniqueness.
        // Let's implement a 24-hour timeout (standard "daily unique visitor") 
        // OR just count once per unique IP forever if that's interpreted strictly.
        // Given "contador real", usually means unique visitors.
        // Let's stick to: count if IP is new OR if last visit was > 24 hours ago.

        // For "real counter" usually you want unique visitors ever? 
        // Or page loads? No, "visits".
        // I will implement: 1 count per IP per 24 hours.

        const ONE_DAY = 24 * 60 * 60 * 1000;

        if (!lastVisit || (now - lastVisit > ONE_DAY)) {
            data.total = (data.total || 0) + 1;
            data.ips[ip] = now;
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        }

        return data.total;
    } catch (error) {
        console.error('Error recording visit:', error);
        return 0;
    }
};
