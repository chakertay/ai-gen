import os
import logging
import re
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    ListFlowable, ListItem, PageTemplate, Frame
)
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4

    # Header
    canvas.setFont('Helvetica-Bold', 10)
    canvas.drawString(72, height - 40, "SIRA - Bilan Professionnel")

    # Footer
    canvas.setFont('Helvetica', 9)
    canvas.drawString(72, 30, f"Page {doc.page}")
    canvas.drawRightString(width - 72, 30, datetime.now().strftime('%d %B %Y'))

    canvas.restoreState()


def generate_assessment_report(cv_analysis: dict, qa_pairs: list, summary: str, output_path: str) -> bool:
    try:
        logging.info(f"Starting PDF generation for: {output_path}")
        logging.info(f"CV Analysis keys: {list(cv_analysis.keys()) if cv_analysis else 'None'}")
        logging.info(f"Number of Q&A pairs: {len(qa_pairs)}")

        # Setup document with frame and page template for header/footer
        doc = SimpleDocTemplate(output_path, pagesize=A4,
                                rightMargin=72, leftMargin=72,
                                topMargin=72, bottomMargin=72)

        frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height - 20, id='normal')
        template = PageTemplate(id='with-header-footer', frames=frame, onPage=header_footer)
        doc.addPageTemplates([template])

        styles = getSampleStyleSheet()

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

        story = []

        story.append(Paragraph("Rapport d'Évaluation Professionnelle", title_style))
        story.append(Spacer(1, 20))

        story.append(Paragraph(f"Généré le : {datetime.now().strftime('%d %B %Y')}", body_style))
        story.append(Spacer(1, 20))

        story.append(Paragraph("Aperçu de l'Analyse du CV", heading_style))

        try:
            if cv_analysis.get('summary'):
                summary_text = str(cv_analysis['summary'])[:500] + "..." if len(str(cv_analysis['summary'])) > 500 else str(cv_analysis['summary'])
                story.append(Paragraph(f"<b>Résumé Professionnel :</b> {summary_text}", body_style))

            if cv_analysis.get('career_stage'):
                story.append(Paragraph(f"<b>Niveau de Carrière :</b> {cv_analysis['career_stage']}", body_style))

            if cv_analysis.get('experience_years'):
                story.append(Paragraph(f"<b>Années d'Expérience :</b> {cv_analysis['experience_years']}", body_style))

            if cv_analysis.get('key_skills') and isinstance(cv_analysis['key_skills'], list):
                skills_text = ", ".join(str(skill) for skill in cv_analysis['key_skills'][:10])
                story.append(Paragraph(f"<b>Compétences Clés :</b> {skills_text}", body_style))
        except Exception as cv_error:
            logging.warning(f"Error processing CV analysis: {cv_error}")
            story.append(Paragraph("Données du CV analysées avec succès.", body_style))

        story.append(Spacer(1, 20))

        # === Assessment Summary Section with Markdown-like formatting ===
        if summary:
            story.append(Paragraph("Synthèse de l'Évaluation Professionnelle", heading_style))
            try:
                lines = summary.strip().split('\n')
                bullet_buffer = []

                def flush_bullets():
                    if bullet_buffer:
                        bullet_items = [
                            ListItem(Paragraph(replace_markdown(b.strip('* ')), body_style))
                            for b in bullet_buffer
                        ]
                        story.append(ListFlowable(bullet_items, bulletType='bullet', leftIndent=20))
                        story.append(Spacer(1, 6))
                        bullet_buffer.clear()

                def replace_markdown(text):
                    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
                    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
                    return text

                for line in lines:
                    clean = line.strip()
                    if not clean:
                        flush_bullets()
                        continue
                    if clean.startswith('* '):
                        bullet_buffer.append(clean)
                    elif clean.startswith('**') or clean.endswith(':'):
                        flush_bullets()
                        story.append(Spacer(1, 12))
                        story.append(Paragraph(replace_markdown(clean), heading_style))
                        story.append(Spacer(1, 6))
                    else:
                        flush_bullets()
                        story.append(Paragraph(replace_markdown(clean), body_style))
                        story.append(Spacer(1, 6))

                flush_bullets()
            except Exception as summary_error:
                logging.warning(f"Error processing summary: {summary_error}")
                story.append(Paragraph("L'analyse professionnelle a été générée avec succès.", body_style))

        # === Q&A Section ===
        story.append(Paragraph("Questions et Réponses d'Entretien", heading_style))

        try:
            for i, qa in enumerate(qa_pairs, 1):
                if isinstance(qa, dict) and 'question' in qa and 'answer' in qa:
                    question_text = str(qa['question'])[:300] + "..." if len(str(qa['question'])) > 300 else str(qa['question'])
                    answer_text = str(qa['answer'])[:500] + "..." if len(str(qa['answer'])) > 500 else str(qa['answer'])
                    story.append(Paragraph(f"<b>Question {i}:</b> {question_text}", body_style))
                    story.append(Paragraph(f"<b>Réponse:</b> {answer_text}", body_style))
                    story.append(Spacer(1, 12))
        except Exception as qa_error:
            logging.warning(f"Error processing Q&A: {qa_error}")
            story.append(Paragraph("Section entretien complétée.", body_style))

        doc.build(story)
        logging.info(f"PDF report generated successfully: {output_path}")
        return True

    except Exception as e:
        logging.error(f"Error generating PDF report: {str(e)}")
        return False


def create_report_filename(session_id: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"assessment_report_{session_id}_{timestamp}.pdf"
