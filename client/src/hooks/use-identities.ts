import { useMutation } from "@tanstack/react-query";
import { api, type RegisterIdentityRequest, type VerifyIdentityRequest, type VerifyIdentityResponse } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useRegisterIdentity() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: RegisterIdentityRequest) => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('taakad_token') : null;
      const headers: Record<string,string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(api.identities.register.path, {
        method: api.identities.register.method,
        headers,
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to register identity");
      }
      
      return api.identities.register.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      toast({
        title: "Identity Issued",
        description: "Your identity has been securely hashed and stored.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useVerifyIdentity() {
  return useMutation({
    mutationFn: async (data: VerifyIdentityRequest): Promise<VerifyIdentityResponse> => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('taakad_token') : null;
      const headers: Record<string,string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(api.verification.verify.path, {
        method: api.verification.verify.method,
        headers,
        body: JSON.stringify(data),
      });

      if (res.status === 404) {
        throw new Error("Identity not found in database");
      }
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Verification failed");
      }

      return api.verification.verify.responses[200].parse(await res.json());
    },
  });
}
