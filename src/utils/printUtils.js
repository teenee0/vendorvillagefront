import { getFileUrl } from "./getFullFileUrl";


export const openReceiptPdf = async (receiptPdfFile) => {
    if (!receiptPdfFile) {
        console.error("PDF файл чека не найден");
        return;
    }

    try {
        const response = await fetch(
            receiptPdfFile.startsWith("http")
                ? receiptPdfFile
                : getFileUrl(receiptPdfFile),
            {
                credentials: "include",
            }
        );

        if (!response.ok) throw new Error("Ошибка загрузки PDF");

        const pdfBlob = await response.blob();
        const pdfUrl = URL.createObjectURL(pdfBlob);

        const newWindow = window.open(pdfUrl, "_blank");

        setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);

        return newWindow;
    } catch (error) {
        console.error("Ошибка при открытии PDF:", error);

        const fallbackUrl = receiptPdfFile.startsWith("http")
            ? receiptPdfFile
            : getFileUrl(receiptPdfFile);
        window.open(fallbackUrl, "_blank");
    }
};

export const printReceiptPdf = async (receiptPdfFile) => {
    const printWindow = await openReceiptPdf(receiptPdfFile);

    if (!printWindow) return;

    setTimeout(() => {
        try {
            printWindow.print();
        } catch (e) {
            console.log("Не удалось вызвать печать через JS. Откройте PDF вручную и нажмите Ctrl+P.");
        }
    }, 1000);
};