import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateAndUploadSOW = async (
    project: any,
    data: {
        materials: any[],
        equipment: any[],
        changeOrders: any[],
        dailyReports: any[],
        photos: any[],
        documents: any[]
    },
    selectedSections: string[],
    supabase: any,
    userId: string
) => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Helper to add centered text
    const addCenteredText = (text: string, y: number, size: number, fontStyle: string = 'normal') => {
        doc.setFontSize(size);
        doc.setFont('helvetica', fontStyle);
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // Helper to load image
    const loadImage = async (url: string, isJpeg = false): Promise<{ dataUrl: string, width: number, height: number }> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                const MAX_DIM = 600;
                if (width > height && width > MAX_DIM) {
                    height *= MAX_DIM / width;
                    width = MAX_DIM;
                } else if (height > MAX_DIM) {
                    width *= MAX_DIM / height;
                    height = MAX_DIM;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    if (isJpeg) {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, width, height);
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve({
                        dataUrl: canvas.toDataURL(isJpeg ? 'image/jpeg' : 'image/png', 0.4),
                        width,
                        height
                    });
                } else {
                    reject('Could not get canvas context');
                }
            };
            img.onerror = (e) => reject(e);
            img.src = url;
        });
    };

    // --- PAGE 1: COVER PAGE ---
    try {
        // Load logo from public folder
        const { dataUrl: logoDataUrl, width: imgW, height: imgH } = await loadImage('/primary-logo-torch.jpg', true);
        const logoWidth = 100;
        const logoHeight = (imgH / imgW) * logoWidth;
        doc.addImage(logoDataUrl, 'JPEG', (pageWidth - logoWidth) / 2, 40, logoWidth, logoHeight);
    } catch (e) {
        console.warn('Could not load logo for PDF', e);
        addCenteredText('COTTLE CONSTRUCTION', 50, 24, 'bold');
    }

    doc.setTextColor(50, 50, 50);
    addCenteredText('STATEMENT OF WORK', 110, 28, 'bold');
    
    doc.setTextColor(0, 0, 0);
    addCenteredText(project.project_name || 'Project Name Not Specified', 130, 20, 'bold');
    
    doc.setTextColor(80, 80, 80);
    addCenteredText(`Job Number: ${project.job_number || 'N/A'}`, 142, 14, 'normal');
    if (project.location) {
        addCenteredText(project.location, 150, 12, 'normal');
    }

    // Company info at bottom
    doc.setTextColor(100, 100, 100);
    addCenteredText('Cottle Construction • (555) 123-4567 • www.cottleconstruction.com', pageHeight - 30, 10, 'normal');

    // --- PAGE 2: TABLE OF CONTENTS ---
    doc.addPage();
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Table of Contents', margin, 30);

    let tocY = 50;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    
    const orderedSections = [
        { id: 'general_notes', title: 'General Notes & Details' },
        { id: 'materials', title: 'Material Requirements' },
        { id: 'equipment', title: 'Equipment List' },
        { id: 'change_orders', title: 'Approved Change Orders' },
        { id: 'daily_reports', title: 'Daily Reports Summary' },
        { id: 'photos', title: 'Project Photos' },
        { id: 'documents', title: 'Project Documents' }
    ].filter(s => selectedSections.includes(s.id));

    orderedSections.forEach((section, index) => {
        doc.text(`${index + 1}. ${section.title}`, margin, tocY);
        tocY += 12;
    });

    // --- SUBSEQUENT PAGES ---
    for (let index = 0; index < orderedSections.length; index++) {
        const section = orderedSections[index];
        doc.addPage();
        let currentY = 30;
        
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${section.title}`, margin, currentY);
        currentY += 15;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        switch (section.id) {
            case 'general_notes':
                if (project.estimated_hours) {
                    doc.setFont('helvetica', 'bold');
                    doc.text('Estimated Labor Hours:', margin, currentY);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`${project.estimated_hours} Hours`, margin + 60, currentY);
                    currentY += 10;
                }
                if (project.measurements) {
                    doc.setFont('helvetica', 'bold');
                    doc.text('Site Measurements:', margin, currentY);
                    currentY += 6;
                    doc.setFont('helvetica', 'normal');
                    const splitMeasurements = doc.splitTextToSize(project.measurements, pageWidth - (margin * 2));
                    doc.text(splitMeasurements, margin, currentY);
                    currentY += (splitMeasurements.length * 6) + 5;
                }
                if (project.project_notes) {
                    doc.setFont('helvetica', 'bold');
                    doc.text('General Notes:', margin, currentY);
                    currentY += 6;
                    doc.setFont('helvetica', 'normal');
                    const splitNotes = doc.splitTextToSize(project.project_notes, pageWidth - (margin * 2));
                    doc.text(splitNotes, margin, currentY);
                    currentY += (splitNotes.length * 6) + 5;
                }
                break;

            case 'materials':
                if (data.materials.length > 0) {
                    autoTable(doc, {
                        startY: currentY,
                        head: [['Material Name', 'Quantity', 'Unit']],
                        body: data.materials.map(m => [m.material_name, m.quantity?.toString() || '0', m.unit_measure || '']),
                        theme: 'striped',
                        headStyles: { fillColor: [41, 128, 185] }
                    });
                    currentY = doc.lastAutoTable.finalY + 10;
                } else {
                    doc.text('No materials specified.', margin, currentY);
                }
                break;

            case 'equipment':
                if (data.equipment.length > 0) {
                    autoTable(doc, {
                        startY: currentY,
                        head: [['Equipment Name', 'Duration']],
                        body: data.equipment.map(e => [e.equipment_name, `${e.duration} ${e.duration_unit}`]),
                        theme: 'striped',
                        headStyles: { fillColor: [39, 174, 96] }
                    });
                    currentY = doc.lastAutoTable.finalY + 10;
                } else {
                    doc.text('No equipment specified.', margin, currentY);
                }
                break;

            case 'change_orders':
                if (data.changeOrders.length > 0) {
                    autoTable(doc, {
                        startY: currentY,
                        head: [['Name', 'Details', 'Date']],
                        body: data.changeOrders.map(co => [
                            co.name, 
                            co.details, 
                            new Date(co.created_at).toLocaleDateString()
                        ]),
                        theme: 'striped',
                        headStyles: { fillColor: [211, 84, 0] }
                    });
                    currentY = doc.lastAutoTable.finalY + 10;
                } else {
                    doc.text('No change orders recorded.', margin, currentY);
                }
                break;

            case 'daily_reports':
                if (data.dailyReports.length > 0) {
                    autoTable(doc, {
                        startY: currentY,
                        head: [['Date', 'Weather', 'Hours', 'Work Completed']],
                        body: data.dailyReports.map(dr => [
                            new Date(dr.date).toLocaleDateString(),
                            dr.weather || '',
                            dr.total_hours?.toString() || '0',
                            dr.work_completed || ''
                        ]),
                        theme: 'striped',
                        headStyles: { fillColor: [142, 68, 173] }
                    });
                    currentY = doc.lastAutoTable.finalY + 10;
                } else {
                    doc.text('No daily reports submitted.', margin, currentY);
                }
                break;

            case 'documents':
                if (data.documents.length > 0) {
                    autoTable(doc, {
                        startY: currentY,
                        head: [['Document Name', 'Description', 'Uploaded']],
                        body: data.documents.map(doc => [
                            doc.name,
                            doc.description || '',
                            new Date(doc.created_at).toLocaleDateString()
                        ]),
                        theme: 'grid',
                        headStyles: { fillColor: [100, 100, 100] }
                    });
                    currentY = doc.lastAutoTable.finalY + 10;
                } else {
                    doc.text('No documents uploaded.', margin, currentY);
                }
                break;

            case 'photos':
                if (data.photos.length > 0) {
                    for (const photo of data.photos) {
                        try {
                            const { data: urlData } = await supabase.storage.from('project_files').createSignedUrl(photo.photo_url, 60);
                            if (urlData?.signedUrl) {
                                const { dataUrl: imgData, width: imgW, height: imgH } = await loadImage(urlData.signedUrl, true);
                                
                                const maxImgWidth = pageWidth - (margin * 2);
                                let drawWidth = maxImgWidth;
                                let drawHeight = (imgH / imgW) * drawWidth;
                                
                                if (drawHeight > 160) {
                                    drawHeight = 160;
                                    drawWidth = (imgW / imgH) * drawHeight;
                                }
                                
                                if (currentY + drawHeight + 20 > pageHeight) {
                                    doc.addPage();
                                    currentY = 20;
                                }

                                doc.addImage(imgData, 'JPEG', margin, currentY, drawWidth, drawHeight, undefined, 'FAST');
                                currentY += drawHeight + 5;
                                
                                doc.setFontSize(10);
                                doc.text(`${photo.photo_type.replace('_', ' ')} - ${photo.description || 'No description'} - ${new Date(photo.created_at).toLocaleDateString()}`, margin, currentY);
                                currentY += 15;
                                doc.setFontSize(12);
                            }
                        } catch (e) {
                            console.warn("Could not load photo", photo.photo_url, e);
                        }
                    }
                } else {
                    doc.text('No photos uploaded or selected.', margin, currentY);
                }
                break;
        }
    }

    // Generate Blob
    const pdfBlob = doc.output('blob');
    
    // Upload to Supabase Storage
    const fileName = `${project.id}/documents/SOW_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
        .from('project_files')
        .upload(fileName, pdfBlob);

    if (uploadError) {
        throw new Error('Failed to upload SOW to storage: ' + uploadError.message);
    }

    // Insert into project_documents table
    const { error: dbError } = await supabase.from('project_documents').insert({
        project_id: project.id,
        name: `Statement of Work - ${new Date().toLocaleDateString()}`,
        description: 'Automatically generated Statement of Work',
        file_path: fileName,
        uploaded_by: userId
    });

    if (dbError) {
        // Rollback storage if db fails
        await supabase.storage.from('project_files').remove([fileName]);
        throw new Error('Failed to save SOW document record: ' + dbError.message);
    }

    return true;
};
