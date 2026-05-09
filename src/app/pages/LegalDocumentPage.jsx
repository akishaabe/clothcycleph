import { Link } from "react-router-dom";
import { ArrowLeft, Recycle } from "lucide-react";

const documents = {
  terms: {
    title: "ClothCycle PH Terms and Conditions",
    effectiveDate: "May 8, 2026", /* date to be updated before deployment */
    description:
      "These Terms and Conditions govern your access to and use of the ClothCycle PH web application, services, features, and platform.",
    intro: [
      "Welcome to ClothCycle PH. These Terms and Conditions govern your access to and use of the ClothCycle PH web application, services, features, and platform.",
      "By accessing or using ClothCycle PH, you agree to comply with and be bound by these Terms. If you do not agree with any part of these Terms, you must discontinue use of the platform.",
    ],
    sections: [
      {
        title: "1. About ClothCycle PH",
        paragraphs: [
          "ClothCycle PH is a Decision Support System (DSS)-based web platform designed to support sustainable textile and apparel disposal, redistribution, recycling, and upcycling practices in the Philippines.",
          "The platform provides users with sustainability-oriented recommendations based on information submitted by users, including textile type, condition, and intended disposal pathway.",
          "ClothCycle PH acts as a digital intermediary and recommendation platform only. The platform does not directly process textile materials, manufacture products, provide logistics services, or guarantee acceptance of textile submissions by partner organizations.",
        ],
      },
      {
        title: "2. Eligibility",
        paragraphs: ["By using ClothCycle PH, you confirm that:"],
        bullets: [
          "You are at least eighteen (18) years old, or",
          "You are using the platform under the supervision and consent of a parent, guardian, or authorized institution.",
          "The information you provide is accurate, complete, and not misleading.",
        ],
      },
      {
        title: "3. User Accounts",
        paragraphs: [
          "Users may create accounts to access certain platform features, including submission tracking and sustainability history.",
          "You are responsible for:",
        ],
        bullets: [
          "Maintaining the confidentiality of your login credentials;",
          "All activities conducted under your account;",
          "Ensuring that all submitted information is truthful and lawful.",
        ],
        closing:
          "ClothCycle PH reserves the right to suspend, restrict, or terminate accounts involved in fraudulent, abusive, or unlawful activities.",
      },
      {
        title: "4. Acceptable Use",
        paragraphs: ["Users agree not to:"],
        bullets: [
          "Submit false, misleading, or fraudulent information;",
          "Upload harmful, offensive, defamatory, or illegal content;",
          "Attempt unauthorized access to the platform or its databases;",
          "Use the platform for commercial spam or unauthorized advertising;",
          "Upload materials that violate intellectual property rights;",
          "Submit hazardous, contaminated, medical, or illegal materials through the platform.",
        ],
        closing:
          "Users must comply with all applicable Philippine laws and regulations while using ClothCycle PH.",
      },
      {
        title: "5. Decision Support Recommendations",
        paragraphs: [
          "ClothCycle PH uses rule-based recommendation logic to provide suggested pathways such as:",
        ],
        bullets: ["Donation", "Recycling", "Upcycling", "Upcycling with Buyback"],
        extraParagraphs: [
          "Recommendations are generated using user-submitted information and sustainability-oriented criteria.",
          "Users acknowledge that recommendations are advisory in nature only, do not guarantee acceptance by partner organizations, and remain subject to partner policies, operational capacity, and verification procedures.",
          "ClothCycle PH does not guarantee environmental outcomes, resale value, or successful processing.",
        ],
      },
      {
        title: "6. Partner Organizations",
        paragraphs: [
          "ClothCycle PH may display partner organizations including donation centers, recycling facilities, social enterprises, and upcycling businesses.",
          "The platform does not own, operate, or directly control these organizations.",
          "Users understand that:",
        ],
        bullets: [
          "Partner availability may change without notice;",
          "Partner services may vary by location and operational capacity;",
          "Transactions or arrangements between users and partners occur independently of ClothCycle PH;",
          "ClothCycle PH is not liable for disputes, damages, delays, losses, or failed transactions involving third-party partners.",
        ],
      },
      {
        title: "7. User-Generated Content",
        paragraphs: [
          "Users may upload photographs, descriptions, and textile-related information.",
          "By submitting content, you:",
        ],
        bullets: [
          "Confirm that you own or have the right to use the content;",
          "Grant ClothCycle PH a non-exclusive, limited license to use, display, and process the content for platform operations, research, system improvement, and sustainability reporting;",
          "Agree not to upload content that infringes copyrights, trademarks, or privacy rights.",
        ],
        closing:
          "ClothCycle PH reserves the right to remove content that violates these Terms.",
      },
      {
        title: "8. Sustainability Metrics and Tracking",
        paragraphs: ["The platform may provide sustainability indicators such as:"],
        bullets: [
          "Estimated textile waste diverted;",
          "Number of items submitted;",
          "Community impact statistics;",
          "User sustainability activity records.",
        ],
        closing:
          "These indicators are estimates intended for educational and informational purposes only and should not be interpreted as scientifically audited environmental measurements.",
      },
      {
        title: "9. Intellectual Property",
        paragraphs: [
          "All platform content, including but not limited to logos, interface designs, recommendation logic, databases, system architecture, text, graphics, and software components are owned by or licensed to ClothCycle PH unless otherwise stated.",
          "Users may not copy, modify, redistribute, reverse engineer, commercially exploit, or republish platform materials without prior written permission.",
        ],
      },
      {
        title: "10. Privacy and Data Protection",
        paragraphs: [
          "ClothCycle PH complies with the Data Privacy Act of 2012 (Republic Act No. 10173) and applicable Philippine data privacy regulations.",
          "Please refer to the ClothCycle PH Privacy Policy for detailed information regarding data collection, data usage, user rights, data storage, and security measures.",
        ],
      },
      {
        title: "11. Limitation of Liability",
        paragraphs: [
          "To the maximum extent permitted by law, ClothCycle PH, its developers, researchers, affiliates, and partners shall not be liable for indirect or consequential damages, data loss, service interruptions, inaccurate recommendations, failed partner transactions, environmental claims, loss of profits, or unauthorized third-party access.",
          'The platform is provided on an "as-is" and "as-available" basis without warranties of any kind.',
        ],
      },
      {
        title: "12. Research and Academic Nature of the Platform",
        paragraphs: [
          "ClothCycle PH may operate as part of an academic or research initiative related to sustainable textile management and decision support systems.",
          "Certain features, recommendations, and sustainability analyses may be continuously updated, modified, or evaluated for research and educational purposes.",
        ],
      },
      {
        title: "13. Service Availability",
        paragraphs: [
          "ClothCycle PH does not guarantee uninterrupted or error-free operation.",
          "The platform reserves the right to modify features, suspend services, remove content, perform maintenance, restrict access, or discontinue services at any time without prior notice.",
        ],
      },
      {
        title: "14. Termination",
        paragraphs: [
          "ClothCycle PH may terminate or suspend access to users who violate these Terms, engage in fraudulent or abusive behavior, compromise system security, or misuse platform services.",
          "Users may also voluntarily discontinue use of the platform at any time.",
        ],
      },
      {
        title: "15. Governing Law",
        paragraphs: [
          "These Terms shall be governed by and interpreted in accordance with the laws of the Republic of the Philippines.",
          "Any disputes arising from the use of ClothCycle PH shall be subject to the appropriate courts and legal authorities within the Philippines.",
        ],
      },
      {
        title: "16. Changes to Terms",
        paragraphs: [
          "ClothCycle PH reserves the right to update or revise these Terms at any time.",
          "Users will be notified of material changes through the platform or other reasonable communication methods. Continued use of the platform after updates constitutes acceptance of the revised Terms.",
        ],
      },
      {
        title: "17. Contact Information",
        paragraphs: [
          "For inquiries regarding these Terms and Conditions, users may contact ClothCycle PH.",
          "Email: clothcycleph@gmail.com",
          "Location: Philippines",
        ],
      },
    ],
  },
  privacy: {
    title: "ClothCycle PH Privacy Policy",
    effectiveDate: "May 8, 2026", /* date to be updated before deployment */
    description:
      "This Privacy Policy explains how ClothCycle PH collects, uses, stores, and protects your information when you use the platform.",
    intro: [
      "ClothCycle PH values your privacy and is committed to protecting your personal information in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173).",
      "This Privacy Policy explains how ClothCycle PH collects, uses, stores, and protects your information when you use the platform.",
    ],
    sections: [
      {
        title: "1. Introduction",
        paragraphs: [
          "ClothCycle PH is a Decision Support System (DSS)-based web application designed to support sustainable textile disposal, redistribution, recycling, and upcycling practices.",
          "By accessing or using ClothCycle PH, you acknowledge that you have read, understood, and agreed to the collection and processing of your information in accordance with this Privacy Policy.",
        ],
      },
      {
        title: "2. Information We Collect",
        paragraphs: ["ClothCycle PH may collect the following categories of information:"],
        groups: [
          {
            title: "A. Personal Information",
            bullets: [
              "Full name",
              "Email address",
              "Contact number",
              "Username and password credentials",
              "User-provided location information",
            ],
          },
          {
            title: "B. Textile Submission Information",
            bullets: [
              "Garment descriptions",
              "Fabric type",
              "Item condition",
              "Uploaded images",
              "Intended disposal pathway",
              "Sustainability preferences",
              "Submission history and tracking updates",
            ],
          },
          {
            title: "C. Technical and Usage Information",
            bullets: [
              "IP address",
              "Browser type",
              "Device information",
              "Login timestamps",
              "Platform activity logs",
              "System interaction data",
            ],
          },
        ],
      },
      {
        title: "3. Purpose of Data Collection",
        paragraphs: [
          "ClothCycle PH collects and processes information for the following purposes:",
        ],
        bullets: [
          "To generate sustainability-based DSS recommendations;",
          "To process textile submissions and routing suggestions;",
          "To maintain and manage user accounts;",
          "To improve platform performance and functionality;",
          "To provide submission tracking and sustainability metrics;",
          "To support research, system evaluation, and academic purposes;",
          "To communicate service updates and notifications;",
          "To prevent unauthorized access, fraud, or misuse;",
          "To comply with legal and regulatory obligations.",
        ],
        closing:
          "We only process information for lawful, legitimate, and sustainability-oriented purposes.",
      },
      {
        title: "4. Legal Basis for Processing",
        paragraphs: ["ClothCycle PH processes information based on:"],
        bullets: [
          "User consent;",
          "Legitimate interests related to sustainability research and platform operations;",
          "Compliance with applicable Philippine laws and regulations.",
        ],
        closing:
          "Users may withdraw consent where applicable, subject to operational and legal limitations.",
      },
      {
        title: "5. How We Share Information",
        paragraphs: [
          "ClothCycle PH does not sell, rent, or trade personal information.",
          "Information may only be shared under the following circumstances:",
        ],
        groups: [
          {
            title: "A. Partner Organizations",
            paragraphs: [
              "Limited textile submission information may be shared with selected partner organizations when users choose to coordinate donation, recycling, or upcycling activities.",
            ],
          },
          {
            title: "B. Service Providers",
            paragraphs: [
              "Authorized technical providers may access limited information strictly for system hosting, maintenance, analytics, security monitoring, and technical support.",
            ],
          },
          {
            title: "C. Legal Compliance",
            paragraphs: [
              "Information may be disclosed when required by Philippine law, court orders, government authorities, or regulatory agencies.",
            ],
          },
        ],
      },
      {
        title: "6. Data Storage and Retention",
        paragraphs: [
          "ClothCycle PH stores information using reasonable technical and organizational safeguards.",
          "Information is retained only for as long as necessary to fulfill operational purposes, support research objectives, maintain system functionality, resolve disputes, and comply with legal obligations.",
          "Data that is no longer necessary may be securely deleted, anonymized, or archived.",
        ],
      },
      {
        title: "7. Data Security",
        paragraphs: ["ClothCycle PH implements reasonable security measures including:"],
        bullets: [
          "Password protection;",
          "Restricted administrative access;",
          "Secure database management;",
          "Activity monitoring;",
          "Protection against unauthorized access.",
        ],
        closing:
          "While reasonable safeguards are implemented, no online platform can guarantee complete security. Users acknowledge the inherent risks associated with digital communication and internet-based systems.",
      },
      {
        title: "8. User Rights",
        paragraphs: [
          "Under the Data Privacy Act of 2012, users may have the right to:",
        ],
        bullets: [
          "Access personal information;",
          "Correct inaccurate or outdated information;",
          "Request deletion of personal data;",
          "Withdraw consent;",
          "Object to certain processing activities;",
          "Request data portability where applicable.",
        ],
        closing:
          "Requests may require identity verification and may be subject to applicable legal limitations.",
      },
      {
        title: "9. Cookies and Tracking Technologies",
        paragraphs: ["ClothCycle PH may use cookies and similar technologies to:"],
        bullets: [
          "Maintain user sessions;",
          "Improve functionality;",
          "Analyze user behavior and platform usage;",
          "Enhance user experience.",
        ],
        closing:
          "Users may modify browser settings to disable cookies; however, some features of the platform may not function properly.",
      },
      {
        title: "10. Third-Party Links",
        paragraphs: [
          "The platform may contain links to external websites, partner organizations, or third-party services.",
          "ClothCycle PH is not responsible for external privacy practices, third-party content, or policies of linked websites or services.",
          "Users are encouraged to review third-party privacy policies independently.",
        ],
      },
      {
        title: "11. Research and Academic Use",
        paragraphs: [
          "ClothCycle PH may operate as part of an academic and sustainability research initiative.",
          "Anonymized and aggregated information may be used for research analysis, system evaluation, academic publications, presentations, and sustainability reporting.",
          "Personally identifiable information will not be publicly disclosed without consent unless required by law.",
        ],
      },
      {
        title: "12. Children's Privacy",
        paragraphs: [
          "ClothCycle PH does not knowingly collect personal information from minors without appropriate parental, guardian, or institutional consent.",
          "If unauthorized child information is identified, reasonable efforts will be made to remove the data.",
        ],
      },
      {
        title: "13. International Users",
        paragraphs: [
          "Although ClothCycle PH primarily operates within the Philippines, users accessing the platform from other countries acknowledge that their information may be processed in accordance with Philippine laws and regulations.",
        ],
      },
      {
        title: "14. Changes to this Privacy Policy",
        paragraphs: [
          "ClothCycle PH reserves the right to modify or update this Privacy Policy at any time.",
          "Users will be notified of material changes through the platform or other reasonable communication methods. Continued use of the platform after changes take effect constitutes acceptance of the updated Privacy Policy.",
        ],
      },
      {
        title: "15. Contact Information",
        paragraphs: [
          "For questions, concerns, or requests related to this Privacy Policy, users may contact ClothCycle PH.",
          "Email: clothcycleph@gmail.com",
          "Location: Philippines",
        ],
      },
      {
        title: "16. Consent",
        paragraphs: [
          "By using ClothCycle PH, you voluntarily consent to the collection, processing, storage, and use of your information as described in this Privacy Policy.",
        ],
      },
    ],
  },
};

function Section({ section }) {
  return (
    <article className="border-t border-[#dce4da] py-7 first:border-t-0 first:pt-0">
      <h2 className="font-sans text-xl font-bold text-[#19221d]">
        {section.title}
      </h2>

      {[...(section.paragraphs ?? []), ...(section.extraParagraphs ?? [])].map(
        (paragraph) => (
          <p key={paragraph} className="mt-3 leading-relaxed text-[#5f6f67]">
            {paragraph}
          </p>
        )
      )}

      {section.bullets && (
        <ul className="mt-4 list-disc space-y-2 pl-6 text-[#5f6f67]">
          {section.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}

      {section.groups?.map((group) => (
        <div key={group.title} className="mt-5">
          <h3 className="font-sans text-base font-bold text-[#19221d]">
            {group.title}
          </h3>
          {group.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="mt-2 leading-relaxed text-[#5f6f67]">
              {paragraph}
            </p>
          ))}
          {group.bullets && (
            <ul className="mt-3 list-disc space-y-2 pl-6 text-[#5f6f67]">
              {group.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {section.closing && (
        <p className="mt-4 leading-relaxed text-[#5f6f67]">
          {section.closing}
        </p>
      )}
    </article>
  );
}

export function LegalDocumentPage({ type }) {
  const document = documents[type] ?? documents.terms;

  return (
    <div className="app-darkable-page min-h-screen bg-[radial-gradient(circle_at_top_left,_#e7ebe6,_transparent_28%),linear-gradient(135deg,#f8faf6,#f3f5f2,#e7ebe6)] text-[#19221d]">
      <nav className="sticky top-0 z-20 border-b border-[#e1e7df] bg-white/85 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Recycle className="h-6 w-6 text-[#336158]" />
            <span className="font-gloock text-xl text-[#19221d]">
              ClothCycle PH
            </span>
          </Link>

          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-xl border border-[#dce4da] bg-white px-4 py-2 text-[#336158] transition-colors hover:bg-[#f3f5f2]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign Up
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl p-6">
        <section className="mb-8 border-b border-[#dce4da] pb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#336158]">
            Effective Date: {document.effectiveDate}
          </p>
          <h1 className="font-sans text-4xl font-bold text-[#19221d] md:text-5xl">
            {document.title}
          </h1>
          <p className="mt-3 max-w-3xl text-[#5f6f67]">
            {document.description}
          </p>

          <div className="mt-6 space-y-3">
            {document.intro.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed text-[#5f6f67]">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section>
          {document.sections.map((section) => (
            <Section key={section.title} section={section} />
          ))}
        </section>
      </main>
    </div>
  );
}
