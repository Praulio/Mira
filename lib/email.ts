import nodemailer from 'nodemailer';

// Singleton transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

export async function sendTaskAssignedEmail({
  to,
  assignerName,
  taskTitle,
  taskId,
}: {
  to: string;
  assignerName: string;
  taskTitle: string;
  taskId: string;
}): Promise<{ success: boolean }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const taskUrl = `${appUrl}/dashboard?task=${taskId}`;

    const mail = getTransporter();

    await mail.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject: `Te asignaron una tarea: ${taskTitle}`,
      text: `${assignerName} te asignó la tarea "${taskTitle}".\n\nVer tarea: ${taskUrl}`,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return { success: false };
  }
}
