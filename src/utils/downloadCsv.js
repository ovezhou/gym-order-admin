export function downloadCsv({ csv, filename }) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    // Give the browser time to start the download before releasing its URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
