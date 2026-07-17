import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction
} from "@/components/ui/alert-dialog";

export function PaymentModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Limit API Gemini Habis ⚠️</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>Maaf, kredit API Gemini Anda telah habis. Sistem secara otomatis beralih ke penyedia cadangan (OpenRouter), namun untuk layanan premium/prioritas, silakan lakukan pembayaran melalui QRIS.</p>
            <div className="flex justify-center p-4 bg-gray-100 rounded-lg">
              <div className="text-center">
                <div className="w-48 h-48 bg-gray-300 flex items-center justify-center border-2 border-dashed border-gray-500">
                  [QRIS PLACEHOLDER]
                </div>
                <p className="mt-2 text-sm text-gray-600">Scan QRIS untuk Pembayaran</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>Tutup</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
