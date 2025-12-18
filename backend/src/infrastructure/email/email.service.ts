import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly enabled: boolean;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('EMAIL_ENABLED', false);
    this.from = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@lotolink.com'
    );

    if (this.enabled) {
      this.initializeTransporter();
    } else {
      this.logger.warn('Email service is disabled. Set EMAIL_ENABLED=true to enable.');
    }
  }

  private initializeTransporter(): void {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = this.configService.get<number>('EMAIL_PORT', 587);
    const secure = this.configService.get<boolean>('EMAIL_SECURE', false);
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASSWORD');

    if (!host || !user || !pass) {
      this.logger.error(
        'Email configuration is incomplete. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD.'
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });

      this.logger.log(`Email service initialized with host: ${host}`);
    } catch (error) {
      this.logger.error('Failed to initialize email transporter:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug(`Email sending is disabled. Would have sent to: ${options.to}`);
      return false;
    }

    if (!this.transporter) {
      this.logger.error('Email transporter is not initialized');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`Email sent successfully to ${options.to}. Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendRegistrationNotification(data: {
    bancaName: string;
    ownerName: string;
    phone: string;
    email: string;
    location: string;
    bankAccount: string;
  }): Promise<boolean> {
    const adminEmail = this.configService.get<string>(
      'ADMIN_EMAIL',
      'admin@lotolink.com'
    );

    const html = `
      <h2>Nueva Solicitud de Registro de Banca</h2>
      <p>Se ha recibido una nueva solicitud de registro con los siguientes detalles:</p>
      
      <h3>Información de la Banca</h3>
      <ul>
        <li><strong>Nombre de la Banca:</strong> ${data.bancaName}</li>
        <li><strong>Ubicación:</strong> ${data.location}</li>
      </ul>
      
      <h3>Datos de Contacto</h3>
      <ul>
        <li><strong>Propietario:</strong> ${data.ownerName}</li>
        <li><strong>Teléfono:</strong> ${data.phone}</li>
        <li><strong>Email:</strong> ${data.email}</li>
      </ul>
      
      <h3>Datos de Pago</h3>
      <ul>
        <li><strong>Cuenta Bancaria:</strong> ${data.bankAccount}</li>
      </ul>
      
      <p>Por favor, revisa la solicitud y ponte en contacto con el solicitante.</p>
    `;

    const text = `
Nueva Solicitud de Registro de Banca

Información de la Banca:
- Nombre: ${data.bancaName}
- Ubicación: ${data.location}

Datos de Contacto:
- Propietario: ${data.ownerName}
- Teléfono: ${data.phone}
- Email: ${data.email}

Datos de Pago:
- Cuenta Bancaria: ${data.bankAccount}
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `Nueva Solicitud de Registro: ${data.bancaName}`,
      html,
      text,
    });
  }

  async sendContactFormNotification(data: {
    name: string;
    location: string;
    phone: string;
  }): Promise<boolean> {
    const adminEmail = this.configService.get<string>(
      'ADMIN_EMAIL',
      'admin@lotolink.com'
    );

    const html = `
      <h2>Nueva Solicitud de Contacto - Únete a LotoLink</h2>
      <p>Alguien está interesado en unirse a LotoLink:</p>
      
      <ul>
        <li><strong>Nombre de la Banca:</strong> ${data.name}</li>
        <li><strong>Ubicación:</strong> ${data.location}</li>
        <li><strong>Teléfono:</strong> ${data.phone}</li>
      </ul>
      
      <p>Por favor, contacta al solicitante para más información.</p>
    `;

    const text = `
Nueva Solicitud de Contacto - Únete a LotoLink

- Nombre de la Banca: ${data.name}
- Ubicación: ${data.location}
- Teléfono: ${data.phone}

Por favor, contacta al solicitante para más información.
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `Solicitud de Contacto: ${data.name}`,
      html,
      text,
    });
  }

  async sendRegistrationConfirmation(to: string, bancaName: string): Promise<boolean> {
    const html = `
      <h2>¡Gracias por tu Solicitud!</h2>
      <p>Hola,</p>
      <p>Hemos recibido tu solicitud de registro para <strong>${bancaName}</strong>.</p>
      <p>Nuestro equipo revisará tu información y se pondrá en contacto contigo pronto con los próximos pasos.</p>
      
      <p>Mientras tanto, si tienes alguna pregunta, no dudes en contactarnos.</p>
      
      <p>Saludos,<br>El equipo de LotoLink</p>
    `;

    const text = `
¡Gracias por tu Solicitud!

Hola,

Hemos recibido tu solicitud de registro para ${bancaName}.

Nuestro equipo revisará tu información y se pondrá en contacto contigo pronto con los próximos pasos.

Mientras tanto, si tienes alguna pregunta, no dudes en contactarnos.

Saludos,
El equipo de LotoLink
    `;

    return this.sendEmail({
      to,
      subject: 'Confirmación de Solicitud - LotoLink',
      html,
      text,
    });
  }
}
