import { RequestBuilder } from "@snort/system";
import { NostrProfile } from "../const";
import { useMemo } from "react";
import { useRequestBuilder } from "@snort/system-react";
import { useLoaderData } from "react-router-dom";
import { StatusLoaderData } from "../loaders";

export function useStatus() {
    const { events: loaderEvents } = useLoaderData<StatusLoaderData>();
    const req = useMemo(() => {
        const statusReq = new RequestBuilder("status");
        if (import.meta.env.SSR) {
            return statusReq;
        }
        statusReq
            .withOptions({ leaveOpen: true })
            .withFilter()
            .kinds([30999 as number])
            .authors([NostrProfile.id])
            .limit(50);
        return statusReq;
    }, []);

    const data = useRequestBuilder(req);
    return loaderEvents ?? data;
}
