import jsPDF from 'jspdf';

interface InvoiceData {
  id: string;
  type: string;
  item: string;
  date: string;
  amount: string;
  status: string;
  clientName: string;
  clientEmail: string;
}

export const generateInvoicePDF = (order: InvoiceData) => {
  const doc = new jsPDF();
  
  // Configuration
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // En-tête - Logo et titre
  doc.setFillColor(139, 92, 246); // Violet primary
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('ARENAH', margin, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Votre plateforme self-service', margin, 32);

  // Réinitialiser la couleur du texte
  doc.setTextColor(0, 0, 0);
  yPos = 60;

  // Titre de la facture
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Numéro de facture et date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Facture N° ${order.id}`, margin, yPos);
  doc.text(`Date: ${order.date}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 20;

  // Ligne de séparation
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;

  // Informations client
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Facturé à:', margin, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(order.clientName, margin, yPos);
  yPos += 6;
  doc.text(order.clientEmail, margin, yPos);
  yPos += 20;

  // Ligne de séparation
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;

  // Détails de la commande
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Détails de la commande', margin, yPos);
  yPos += 10;

  // En-tête du tableau
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', margin + 5, yPos + 7);
  doc.text('Type', pageWidth - 80, yPos + 7);
  doc.text('Montant', pageWidth - margin - 5, yPos + 7, { align: 'right' });
  yPos += 15;

  // Ligne du produit
  doc.setFont('helvetica', 'normal');
  doc.text(order.item, margin + 5, yPos);
  doc.text(order.type, pageWidth - 80, yPos);
  doc.text(order.amount, pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 15;

  // Ligne de séparation
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Total
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', pageWidth - 80, yPos);
  doc.text(order.amount, pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 20;

  // Statut
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Statut: ${order.status}`, margin, yPos);
  yPos += 30;

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.text('ARENAH - Votre plateforme self-service tout-en-un', pageWidth / 2, footerY, { align: 'center' });
  doc.text('Email: contact@arenah.com | Tél: +229 XX XX XX XX', pageWidth / 2, footerY + 5, { align: 'center' });
  doc.text('Merci pour votre confiance !', pageWidth / 2, footerY + 10, { align: 'center' });

  // Télécharger le PDF
  doc.save(`facture-${order.id}.pdf`);
};
