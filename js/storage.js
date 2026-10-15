const STORAGE_KEY = 'glamurosa-data-v1';
const SESSION_KEY = 'glamurosa-session-v1';

export const USERS = [
    { username: 'admin', password: 'admin123', role: 'admin', name: 'Administradora' },
    { username: 'cliente', password: 'cliente123', role: 'cliente', name: 'Cliente' },
];

function initialData() {
    return { users: USERS.map(({ username, role, name }) => ({ username, role, name })), reservas: [], horarios: ['08:00', '10:30', '14:00'] };
}

export function readData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) { const data = initialData(); writeData(data); return data; }
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.reservas) || !Array.isArray(parsed.users)) throw new Error('Datos inválidos');
        const defaults = initialData();
        if (!Array.isArray(parsed.horarios)) parsed.horarios = defaults.horarios;
        parsed.users = [...defaults.users.filter(user => !parsed.users.some(saved => saved.username === user.username)), ...parsed.users];
        return parsed;
    } catch (error) {
        const data = initialData();
        try { writeData(data); } catch (writeError) { console.error('No se pudo inicializar localStorage:', writeError); }
        return data;
    }
}

export function writeData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
export function getSession() {
    try { const session = JSON.parse(localStorage.getItem(SESSION_KEY)); return session && ['admin', 'cliente'].includes(session.role) ? session : null; }
    catch { return null; }
}
export function login(username, password) {
    const user = USERS.find(item => item.username === username && item.password === password);
    if (!user) return null;
    const session = { username: user.username, role: user.role, name: user.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
}
export function logout() { localStorage.removeItem(SESSION_KEY); }
export function makeId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

readData();
