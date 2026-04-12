import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function exportPdf(el, filename) {
  el.classList.add('printing')
  const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' })
  el.classList.remove('printing')

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'b4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgW = pageW - 20
  const imgH = imgW / (canvas.width / canvas.height)

  let y = 10
  let remainH = imgH
  while (remainH > 0) {
    const sliceH = Math.min(remainH, pageH - 20)
    const srcY = (imgH - remainH) / imgH * canvas.height
    const srcH = sliceH / imgH * canvas.height
    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width = canvas.width
    sliceCanvas.height = srcH
    sliceCanvas.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)
    pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.82), 'JPEG', 10, y, imgW, sliceH)
    remainH -= sliceH
    if (remainH > 0) { pdf.addPage(); y = 10 }
  }

  pdf.save(filename)
}
