import nodemailer from 'nodemailer';

// Create a test account or use your SMTP settings
let transporter: nodemailer.Transporter;

async function createTransporter() {
    // For development, we can use ethereal email (fake SMTP service)
    if (process.env.NODE_ENV === 'development') {
        const testAccount = await nodemailer.createTestAccount();
        
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    } else {
        // For production, use your real SMTP settings
        transporter = nodemailer.createTransport({
            service: 'gmail', // or your email service
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });
    }
}

export async function sendPasswordResetEmail(to: string, resetToken: string) {
    if (!transporter) {
        await createTransporter();
    }

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM || '"Unilink Support" <support@unilink.com>',
        to,
        subject: 'Réinitialisation de votre mot de passe Unilink',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e90ff;">Réinitialisation de votre mot de passe</h2>
                <p>Bonjour,</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
                <p style="margin: 20px 0;">
                    <a href="${resetUrl}" 
                       style="background-color: #1e90ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                        Réinitialiser mon mot de passe
                    </a>
                </p>
                <p>Ce lien expirera dans 1 heure.</p>
                <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">
                    Ceci est un email automatique, merci de ne pas y répondre.
                </p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        
        // If using ethereal email in development, log the preview URL
        if (process.env.NODE_ENV === 'development') {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
        
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send password reset email');
    }
}
