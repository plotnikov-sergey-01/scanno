"use client";

import { useEffect, useState } from "react";
import Link from "@/components/LoadingProvider";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { LoadingLabel } from "@/components/Spinner";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Globe2,
  ScanBarcode,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Product, Review } from "@/lib/types";
import styles from "./page.module.css";

const steps = [
  {
    number: "01",
    icon: ScanBarcode,
    title: "Scan the barcode",
    body: "Find the product in seconds while it is still in your hand.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Leave your verdict",
    body: "Choose buy again, never again, or simply save a note for later.",
  },
  {
    number: "03",
    icon: Globe2,
    title: "Shop with context",
    body: "See what your past self and other shoppers already learned.",
  },
];

const diaryPreview = [
  { name: "Citrus sparkling water", verdict: "Buy again", tone: "buy" },
  { name: "Salted caramel cookies", verdict: "Never again", tone: "never" },
  { name: "Tomato pasta sauce", verdict: "Saved for later", tone: "neutral" },
];

type FeedTone = "buy" | "never" | "new";

function FeedColumn({
  title,
  copy,
  tone,
  products,
}: {
  title: string;
  copy: string;
  tone: FeedTone;
  products: Product[];
}) {
  return (
    <section className={styles.feedColumn}>
      <div className={styles.feedHeading}>
        <span className={`${styles.feedMarker} ${styles[tone]}`} aria-hidden="true" />
        <div>
          <h3>{title}</h3>
          <p>{copy}</p>
        </div>
        <Link href="/explore" className={styles.feedLink} aria-label={`See all ${title.toLowerCase()}`}>
          <ChevronRight aria-hidden="true" />
        </Link>
      </div>

      {products.length > 0 ? (
        <div className={styles.feedRail}>
          {products.slice(0, 3).map((product) => (
            <ProductCard key={product.id} product={product} layout="grid" />
          ))}
        </div>
      ) : (
        <div className={styles.emptyFeed}>
          <p>New decisions will show up here.</p>
          <Link href="/search">Add the first one</Link>
        </div>
      )}
    </section>
  );
}

function verdictLabel(verdict: Review["verdict"]) {
  if (verdict === "buy_again") return "Buy again";
  if (verdict === "never_again") return "Never again";
  return "Worth a note";
}

function ReviewPreview({ review }: { review: Review }) {
  const author = review.user.display_name || review.user.username;
  const initial = author.slice(0, 1).toUpperCase();

  return (
    <article className={styles.reviewCard}>
      <div className={styles.reviewTopline}>
        <Link href={`/u/${review.user.username}`} className={styles.reviewAuthor}>
          <span className={styles.reviewAvatar}>
            {review.user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={review.user.avatar} alt="" />
            ) : (
              initial
            )}
          </span>
          <span>{author}</span>
        </Link>
        <span className={`${styles.reviewVerdict} ${styles[review.verdict]}`}>
          {verdictLabel(review.verdict)}
        </span>
      </div>
      <Link href={`/products/${review.product_id}`} className={styles.reviewProduct}>
        <span className={styles.reviewProductImage}>
          {review.product_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.product_image_url} alt="" />
          ) : (
            <span>{review.product_name.slice(0, 1).toUpperCase()}</span>
          )}
        </span>
        <span>
          <strong>{review.product_name}</strong>
          {review.product_brand && <small>{review.product_brand}</small>}
        </span>
        <ArrowRight aria-hidden="true" />
      </Link>
      <p className={styles.reviewBody}>
        {review.body || `Shared a ${verdictLabel(review.verdict).toLowerCase()} verdict.`}
      </p>
    </article>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const diaryHref = !loading && user ? "/diary" : "/register";
  const [best, setBest] = useState<Product[]>([]);
  const [worst, setWorst] = useState<Product[]>([]);
  const [fresh, setFresh] = useState<Product[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [feedsLoading, setFeedsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.discover("top_rated", { days: 30, limit: 6 }),
      api.discover("most_hated", { days: 30, limit: 6 }),
      api.discover("recent_products", { limit: 6 }),
      api.discover("recent_reviews", { days: 30, limit: 3 }),
    ])
      .then(([top, hated, recent, reviews]) => {
        setBest((top.results as Product[]) || []);
        setWorst((hated.results as Product[]) || []);
        setFresh((recent.results as Product[]) || []);
        setRecentReviews((reviews.results as Review[]) || []);
      })
      .catch(() => {
        // An empty catalog is still a useful first visit.
      })
      .finally(() => setFeedsLoading(false));
  }, []);

  const heroProduct = fresh[0] || best[0] || worst[0];
  const heroProductName = heroProduct?.name || "Citrus sparkling water";
  const heroProductBrand = heroProduct?.brand || "Scanno scan result";

  return (
    <div className={styles.root} id="top">
      <section className={styles.hero}>
        <div className={`${styles.pageWidth} ${styles.heroInner}`}>
          <div className={styles.heroCopyBlock}>
            <p className={styles.eyebrow}>
              <ScanBarcode aria-hidden="true" />
              Your product memory
            </p>
            <h1>
              Do not buy the same <em>disappointment</em> twice.
            </h1>
            <p className={styles.heroDescription}>
              Scan a barcode, leave a simple verdict, and remember exactly what belongs in your
              basket next time.
            </p>
            <div className={styles.heroActions}>
              <Link href="/search" className={styles.primaryAction}>
                <Camera aria-hidden="true" />
                Scan a product
              </Link>
              <Link href="/search" className={styles.secondaryAction}>
                <Search aria-hidden="true" />
                Search by name
              </Link>
            </div>
            <p className={styles.heroNote}>
              <ShieldCheck aria-hidden="true" />
              Keep a private diary, or share your review with other shoppers.
            </p>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.shelfBack}>
              <span className={styles.shelfProductOne} />
              <span className={styles.shelfProductTwo} />
              <span className={styles.shelfProductThree} />
              <span className={styles.shelfLine} />
            </div>
            <div className={styles.phone}>
              <div className={styles.phoneStatus}>
                <span>9:41</span>
                <span className={styles.statusBars} />
              </div>
              <div className={styles.scanView}>
                {heroProduct?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroProduct.image_url} alt="" />
                ) : (
                  <span className={styles.fallbackBottle} />
                )}
                <span className={`${styles.scanCorner} ${styles.scanCornerTopLeft}`} />
                <span className={`${styles.scanCorner} ${styles.scanCornerTopRight}`} />
                <span className={`${styles.scanCorner} ${styles.scanCornerBottomLeft}`} />
                <span className={`${styles.scanCorner} ${styles.scanCornerBottomRight}`} />
                <span className={styles.scanLine} />
              </div>
              <div className={styles.scanResult}>
                <div className={styles.scanResultTopline}>
                  <span>SCANNED</span>
                  <Check aria-hidden="true" />
                </div>
                <strong>{heroProductName}</strong>
                <small>{heroProductBrand}</small>
                <div className={styles.verdictButtons}>
                  <span className={styles.buyVerdict}>Buy again</span>
                  <span className={styles.neverVerdict}>Never again</span>
                </div>
              </div>
              <span className={styles.phoneHome} />
            </div>
            <span className={styles.scanTip}>Point your camera at the barcode</span>
          </div>
        </div>
      </section>

      <section className={styles.liveSection}>
        <div className={styles.pageWidth}>
          <div className={styles.sectionIntro}>
            <div>
              <p className={styles.sectionKicker}>From the shelf</p>
              <h2>Live product verdicts</h2>
              <p>Useful signals from people deciding what to buy again.</p>
            </div>
            <Link href="/explore" className={styles.textAction}>
              Explore all
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          {feedsLoading ? (
            <div className={styles.loadingFeed}>
              <LoadingLabel />
            </div>
          ) : (
            <div className={styles.feedColumns}>
              <FeedColumn
                title="Worth buying"
                copy="Products people would choose again."
                tone="buy"
                products={best}
              />
              <FeedColumn
                title="Skip these"
                copy="The latest never-again decisions."
                tone="never"
                products={worst}
              />
              <FeedColumn
                title="Just added"
                copy="Fresh products waiting for a verdict."
                tone="new"
                products={fresh}
              />
            </div>
          )}
        </div>
      </section>

      <section className={styles.howItWorks}>
        <div className={styles.pageWidth}>
          <div className={styles.centeredIntro}>
            <p className={styles.sectionKicker}>Simple by design</p>
            <h2>Make the next shop easier</h2>
          </div>
          <div className={styles.stepList}>
            {steps.map(({ number, icon: Icon, title, body }) => (
              <article className={styles.step} key={title}>
                <div className={styles.stepNumber}>{number}</div>
                <Icon className={styles.stepIcon} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.diarySection}>
        <div className={`${styles.pageWidth} ${styles.diaryInner}`}>
          <div className={styles.diaryCopy}>
            <p className={styles.darkKicker}>A memory that is actually useful</p>
            <h2>Keep your taste close at hand.</h2>
            <p>
              A personal record for products you loved, avoided, or just want to remember. Your
              private notes remain private unless you choose otherwise.
            </p>
            <Link href={diaryHref} className={styles.lightAction}>
              <BookOpen aria-hidden="true" />
              {user ? "Open your diary" : "Start your diary"}
            </Link>
          </div>

          <div className={styles.diaryPanel}>
            <div className={styles.diaryPanelHeader}>
              <div>
                <span>MY DIARY</span>
                <strong>{user?.profile?.display_name || user?.username || "Your product decisions"}</strong>
              </div>
              <BookOpen aria-hidden="true" />
            </div>
            <div className={styles.diaryRows}>
              {diaryPreview.map((entry) => (
                <div className={styles.diaryRow} key={entry.name}>
                  <span className={`${styles.diaryDot} ${styles[entry.tone]}`} />
                  <span>{entry.name}</span>
                  <strong className={styles[entry.tone]}>{entry.verdict}</strong>
                </div>
              ))}
            </div>
            <div className={styles.diaryPanelFooter}>
              <span>24 saved decisions</span>
              <span>Private by default</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.reviewsSection}>
        <div className={styles.pageWidth}>
          <div className={styles.sectionIntro}>
            <div>
              <p className={styles.sectionKicker}>Public memory</p>
              <h2>What shoppers are saying</h2>
              <p>Small notes that make the next choice less of a gamble.</p>
            </div>
            <Link href="/explore" className={styles.textAction}>
              Read the feed
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          {recentReviews.length > 0 ? (
            <div className={styles.reviewGrid}>
              {recentReviews.map((review) => (
                <ReviewPreview key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyReviews}>
              <p>The public feed is ready for the next useful review.</p>
              <Link href="/search">Find a product to review</Link>
            </div>
          )}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={`${styles.pageWidth} ${styles.finalCtaInner}`}>
          <div>
            <p className={styles.sectionKicker}>Your next shop</p>
            <h2>Make your basket a little more certain.</h2>
          </div>
          <Link href="/search" className={styles.primaryAction}>
            <Camera aria-hidden="true" />
            Scan your first product
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.pageWidth} ${styles.footerInner}`}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.footerLogo}>
              Scanno<span aria-hidden="true" />
            </Link>
            <p>Remember what belongs in your basket.</p>
          </div>
          <div className={styles.footerLinks}>
            <div>
              <h3>Product</h3>
              <Link href="/search">Search and scan</Link>
              <Link href="/explore">Explore verdicts</Link>
              <Link href={diaryHref}>Your diary</Link>
            </div>
            <div>
              <h3>Account</h3>
              <Link href="/login">Log in</Link>
              <Link href="/register">Create account</Link>
            </div>
            <div>
              <h3>Contact</h3>
              <a href="mailto:hello@scanno.app">hello@scanno.app</a>
              <a href="mailto:support@scanno.app">Support</a>
              <a href="mailto:hello@scanno.app?subject=Product%20report">Report a product</a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>Copyright {new Date().getFullYear()} Scanno</span>
            <span>Built for better repeat purchases.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
