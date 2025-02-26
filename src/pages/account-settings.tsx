import useLogin from "../hooks/login";
import { useEffect, useState } from "react";
import { AccountDetail } from "../api";
import { AsyncButton } from "../components/button";
import { Icon } from "../components/icon";

export function AccountSettings() {
    const login = useLogin();
    const [acc, setAcc] = useState<AccountDetail>();
    const [editEmail, setEditEmail] = useState(false);

    useEffect(() => {
        login?.api.getAccount().then(setAcc);
    }, [login]);
    
    function notifications() {
        return <>
            <h3>Notification Settings</h3>
            <div className="flex gap-2 items-center">
                <input type="checkbox" checked={acc?.contact_email ?? false} onChange={(e) => {
                    setAcc((s) => (s ? { ...s, contact_email: e.target.checked } : undefined));
                }} />
                Email
                <input type="checkbox" checked={acc?.contact_nip17 ?? false} onChange={(e) => {
                    setAcc((s) => (s ? { ...s, contact_nip17: e.target.checked } : undefined));
                }} />
                Nostr DM
            </div>
            <div className="flex gap-2 items-center">
                <h4>Email</h4>
                <input type="text" disabled={!editEmail} value={acc?.email} onChange={e => setAcc(s => (s ? { ...s, email: e.target.value } : undefined))} />
                {!editEmail && <Icon name="pencil" onClick={() => setEditEmail(true)} />}
            </div>
            <div>
                <AsyncButton onClick={async () => {
                    if (login?.api && acc) {
                        await login.api.updateAccount(acc);
                        const newAcc = await login.api.getAccount();
                        setAcc(newAcc);
                        setEditEmail(false);
                    }
                }}>
                    Save
                </AsyncButton>
            </div>
        </>
    }

    return <>
        {notifications()}
    </>
}