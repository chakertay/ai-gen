import os
import logging
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

def generate_assessment_report(cv_analysis: dict, qa_pairs: list, summary: str, output_path: str) -> bool:
    """
    Generate a professional PDF report of the assessment
    """
    try:
        logging.info(f"Starting PDF generation for: {output_path}")
        logging.info(f"CV Analysis keys: {list(cv_analysis.keys()) if cv_analysis else 'None'}")
        logging.info(f"Number of Q&A pairs: {len(qa_pairs)}")
        
        # Create the PDF document
        doc = SimpleDocTemplate(output_path, pagesize=A4, 
                              rightMargin=72, leftMargin=72,
                              topMargin=72, bottomMargin=18)
        
        # Get styles
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2E86AB')
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            textColor=colors.HexColor('#2E86AB')
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=11,
            spaceAfter=12,
            alignment=TA_JUSTIFY
        )
        
        # Build the document content
        story = []
        
        # Title
        story.append(Paragraph("Rapport d'Évaluation Professionnelle", title_style))
        story.append(Spacer(1, 20))
        
        # Date
        story.append(Paragraph(f"Généré le : {datetime.now().strftime('%d %B %Y')}", body_style))
        story.append(Spacer(1, 20))
        
        # CV Analysis Section
        story.append(Paragraph("Aperçu de l'Analyse du CV", heading_style))
        
        try:
            if cv_analysis and cv_analysis.get('summary'):
                summary_text = str(cv_analysis['summary'])[:500] + "..." if len(str(cv_analysis['summary'])) > 500 else str(cv_analysis['summary'])
                story.append(Paragraph(f"<b>Résumé Professionnel :</b> {summary_text}", body_style))
            
            if cv_analysis and cv_analysis.get('career_stage'):
                story.append(Paragraph(f"<b>Niveau de Carrière :</b> {cv_analysis['career_stage']}", body_style))
            
            if cv_analysis and cv_analysis.get('experience_years'):
                story.append(Paragraph(f"<b>Années d'Expérience :</b> {cv_analysis['experience_years']}", body_style))
            
            if cv_analysis and cv_analysis.get('key_skills') and isinstance(cv_analysis['key_skills'], list):
                skills_text = ", ".join(str(skill) for skill in cv_analysis['key_skills'][:10])  # Limit to 10 skills
                story.append(Paragraph(f"<b>Compétences Clés :</b> {skills_text}", body_style))
        except Exception as cv_error:
            logging.warning(f"Error processing CV analysis for PDF: {cv_error}")
            story.append(Paragraph(f"<b>CV Analysis:</b> Professional background analysis completed.", body_style))
        
        story.append(Spacer(1, 20))
        
        # Interview Q&A Section
        story.append(Paragraph("Questions et Réponses d'Entretien", heading_style))
        
        try:
            for i, qa in enumerate(qa_pairs, 1):
                if isinstance(qa, dict) and 'question' in qa and 'answer' in qa:
                    question_text = str(qa['question'])[:300] + "..." if len(str(qa['question'])) > 300 else str(qa['question'])
                    answer_text = str(qa['answer'])[:500] + "..." if len(str(qa['answer'])) > 500 else str(qa['answer'])
                    story.append(Paragraph(f"<b>Question {i}:</b> {question_text}", body_style))
                    story.append(Paragraph(f"<b>Response:</b> {answer_text}", body_style))
                    story.append(Spacer(1, 12))
        except Exception as qa_error:
            logging.warning(f"Error processing Q&A for PDF: {qa_error}")
            story.append(Paragraph(f"<b>Interview Completed:</b> {len(qa_pairs)} questions were asked and answered during the assessment.", body_style))
        
        # Assessment Summary
        if summary:
            story.append(Paragraph("Professional Assessment Summary", heading_style))
            try:
                summary_text = str(summary)[:1000] + "..." if len(str(summary)) > 1000 else str(summary)
                story.append(Paragraph(summary_text, body_style))
            except Exception as summary_error:
                logging.warning(f"Error processing summary for PDF: {summary_error}")
                story.append(Paragraph("Professional assessment completed successfully.", body_style))
        
        # Build the PDF
        try:
            doc.build(story)
            logging.info(f"PDF report generated successfully: {output_path}")
            return True
        except Exception as pdf_error:
            logging.error(f"Error building PDF: {str(pdf_error)}")
            return False
        
    except Exception as e:
        logging.error(f"Error generating PDF report: {str(e)}")
        return False

def create_report_filename(session_id: str) -> str:
    """
    Create a unique filename for the report
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"assessment_report_{session_id}_{timestamp}.pdf"
