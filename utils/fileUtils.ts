
export async function dataUrlToFile(
    dataUrl: string,
    fileName: string,
    mimeType: string
  ): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: mimeType });
}
