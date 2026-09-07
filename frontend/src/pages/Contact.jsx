import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { api } from '../api';
import {
  IconMapPin,
  IconMail,
  IconPhone,
  IconClock,
} from '../components/Icons';
import './contact.css';

const EMPTY = { name: '', company: '', phone: '', email: '', subject: '', message: '' };

const EMAILJS_SERVICE_ID = 'CORTEX BENIN TV';
const EMAILJS_TEMPLATE_ID = 'template_21dbv26';
const EMAILJS_PUBLIC_KEY = 'ynBpi7FRsttQVLPKD';

export default function Contact() {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setStatus('sending');
    try {
      await api.submitContactMessage(form);
      setStatus('sent');
      setForm(EMPTY);

      emailjs
        .send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            name: form.name,
            email: form.email,
            phone: form.phone,
            company: form.company,
            subject: form.subject || '(sans objet)',
            title: form.subject || '(sans objet)',
            message: form.message,
            time: new Date().toLocaleString('fr-FR'),
          },
          { publicKey: EMAILJS_PUBLIC_KEY }
        )
        .catch((err) => console.error('EmailJS: échec de l\'envoi de la notification email', err));
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  return (
    <div className="contact-page">
      <section className="contact-hero">
        <div className="contact-hero__overlay" />
        <div className="container contact-hero__content">
          <h1>Contactez-nous</h1>
          <p>Une question, un projet, une proposition de partenariat ? Écrivez-nous.</p>
        </div>
      </section>

      <section className="container contact-touch">
        <h2 className="contact-touch__title">Nous joindre</h2>
        <div className="contact-touch__grid">
          <div className="contact-card">
            <span className="contact-card__icon"><IconMapPin /></span>
            <h3>Siège</h3>
            <p>Cotonou, Bénin</p>
          </div>
          <div className="contact-card">
            <span className="contact-card__icon"><IconMail /></span>
            <h3>Email</h3>
            <p>
              <a href="mailto:cortexbenin@gmail.com">cortexbenin@gmail.com</a>
              <br />
              <a href="mailto:secretariatcortexbenin@gmail.com">secretariatcortexbenin@gmail.com</a>
            </p>
          </div>
          <div className="contact-card">
            <span className="contact-card__icon"><IconPhone /></span>
            <h3>Téléphone</h3>
            <p>
              <a href="tel:+2290199151818">(+229) 01 99 15 18 18</a>
              <br />
              <a href="tel:+2290197656065">01 97 65 60 65</a> / <a href="tel:+2290197393735">01 97 39 37 35</a>
            </p>
          </div>
          <div className="contact-card">
            <span className="contact-card__icon"><IconClock /></span>
            <h3>Disponibilité</h3>
            <p>24h/24 et 7j/7</p>
          </div>
        </div>
      </section>

      <section className="container contact-split">
        <div className="contact-form-wrap">
          <h2>Envoyez-nous un message</h2>
          {status === 'sent' ? (
            <div className="contact-form__success">
              Merci, votre message a bien été envoyé. Notre équipe vous répondra rapidement.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="contact-form">
              {error && <p className="contact-form__error">{error}</p>}
              <div className="contact-form__row">
                <div className="contact-field">
                  <label htmlFor="c-name">Nom *</label>
                  <input id="c-name" required value={form.name} onChange={(e) => update('name', e.target.value)} />
                </div>
                <div className="contact-field">
                  <label htmlFor="c-company">Structure</label>
                  <input id="c-company" value={form.company} onChange={(e) => update('company', e.target.value)} />
                </div>
              </div>
              <div className="contact-form__row">
                <div className="contact-field">
                  <label htmlFor="c-email">Email *</label>
                  <input id="c-email" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
                </div>
                <div className="contact-field">
                  <label htmlFor="c-phone">Téléphone</label>
                  <input id="c-phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                </div>
              </div>
              <div className="contact-field">
                <label htmlFor="c-subject">Sujet</label>
                <input id="c-subject" value={form.subject} onChange={(e) => update('subject', e.target.value)} />
              </div>
              <div className="contact-field">
                <label htmlFor="c-message">Message *</label>
                <textarea id="c-message" rows={6} required value={form.message} onChange={(e) => update('message', e.target.value)} />
              </div>
              <button type="submit" className="contact-form__submit" disabled={status === 'sending'}>
                {status === 'sending' ? 'Envoi…' : 'Envoyer le message'}
              </button>
            </form>
          )}
        </div>
        <div className="contact-photo">
          <img src="/equipe/Contact.jpg" alt="Contactez Cortex Bénin TV" className="contact-photo__img" />
        </div>
      </section>

      <section className="contact-map">
        <iframe
          title="Localisation Cortex Bénin TV"
          src="https://www.google.com/maps?q=Cotonou,Benin&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </section>
    </div>
  );
}
