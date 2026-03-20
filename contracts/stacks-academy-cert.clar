;; ============================================================
;; Stacks Academy Certificate NFT
;; SIP-009 compliant
;; Issued when a learner completes a course module.
;; Only the contract deployer (platform backend key) can mint.
;; ============================================================

;; ---- SIP-009 Trait (inline) ----
(define-trait sip009-nft-trait
  (
    (get-last-token-id ()                         (response uint uint))
    (get-token-uri     (uint)                     (response (optional (string-ascii 256)) uint))
    (get-owner         (uint)                      (response (optional principal) uint))
    (transfer          (uint principal principal)  (response bool uint))
  )
)

;; ---- Constants ----

(define-constant CONTRACT-OWNER tx-sender)

;; Error codes
(define-constant ERR-NOT-OWNER         (err u100))
(define-constant ERR-NOT-TOKEN-OWNER   (err u101))
(define-constant ERR-TOKEN-NOT-FOUND   (err u102))
(define-constant ERR-ALREADY-CERTIFIED (err u103))
(define-constant ERR-INVALID-MODULE    (err u104))
(define-constant ERR-INVALID-SCORE     (err u105))
(define-constant ERR-TRANSFER-TO-SELF  (err u106))

;; Valid module range 1-6
(define-constant MIN-MODULE u1)
(define-constant MAX-MODULE u6)

;; Base token URI for off-chain metadata.
;; The backend serves JSON at: <BASE-TOKEN-URI>/<token-id>
;; Replace with your deployed API domain before going to mainnet.
(define-constant BASE-TOKEN-URI "https://api.stacksacademy.xyz/nft/certificate/")

;; ---- NFT Asset ----

(define-non-fungible-token stacks-academy-cert uint)

;; ---- Data Vars ----

;; Auto-incrementing token counter
(define-data-var last-token-id uint u0)

;; ---- Data Maps ----

;; On-chain metadata per token
(define-map token-module-id  uint uint)       ;; token-id -> module-id (1-6)
(define-map token-score      uint uint)       ;; token-id -> score (0-100)

;; Guard: one certificate per (learner, module) pair
;; Returns the token-id already issued for that combination.
(define-map cert-issued
  { recipient: principal, module-id: uint }
  uint
)

;; ---- SIP-009: get-last-token-id ----

(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

;; ---- SIP-009: get-token-uri ----
;; Returns a static base URI; off-chain resolvers append /<token-id>.
;; token-id is required by the SIP-009 trait signature even though it is not
;; used here (all tokens share the same base URI).
;; #[allow(unused)]
(define-read-only (get-token-uri (token-id uint))
  (ok (some BASE-TOKEN-URI))
)

;; ---- SIP-009: get-owner ----

(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? stacks-academy-cert token-id))
)

;; ---- SIP-009: transfer ----

(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender)                                         ERR-NOT-TOKEN-OWNER)
    (asserts! (not (is-eq sender recipient))                                   ERR-TRANSFER-TO-SELF)
    (asserts! (is-some (nft-get-owner? stacks-academy-cert token-id))          ERR-TOKEN-NOT-FOUND)
    (nft-transfer? stacks-academy-cert token-id sender recipient)
  )
)

;; ---- Mint ----
;;
;; Called exclusively by the platform backend using CONTRACT-OWNER's private key.
;;
;; Parameters:
;;   recipient  - Stacks principal (ST... / SP...) of the learner
;;   module-id  - Course module number, must be 1-6
;;   score      - Percentage score achieved, must be 0-100
;;
;; Returns (ok token-id) on success.

;; #[allow(unchecked_data)]
(define-public (mint
    (recipient  principal)
    (module-id  uint)
    (score      uint)
  )
  (let
    (
      (new-id (+ (var-get last-token-id) u1))
    )
    ;; Only the contract owner may mint
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)

    ;; Module must be in range 1-6
    (asserts!
      (and (>= module-id MIN-MODULE) (<= module-id MAX-MODULE))
      ERR-INVALID-MODULE
    )

    ;; Score must be 0-100
    (asserts! (<= score u100) ERR-INVALID-SCORE)

    ;; Prevent duplicate certificates for the same (learner, module)
    (asserts!
      (is-none (map-get? cert-issued { recipient: recipient, module-id: module-id }))
      ERR-ALREADY-CERTIFIED
    )

    ;; Mint the NFT to the recipient
    (try! (nft-mint? stacks-academy-cert new-id recipient))

    ;; Persist state
    (var-set last-token-id new-id)
    (map-set token-module-id new-id module-id)
    (map-set token-score     new-id score)
    (map-set cert-issued { recipient: recipient, module-id: module-id } new-id)

    (ok new-id)
  )
)

;; ---- Read-Only Helpers ----

;; Returns on-chain metadata for a given token.
(define-read-only (get-token-metadata (token-id uint))
  (match (nft-get-owner? stacks-academy-cert token-id)
    owner
      (ok {
        token-id:  token-id,
        owner:     owner,
        module-id: (default-to u0 (map-get? token-module-id token-id)),
        score:     (default-to u0 (map-get? token-score     token-id))
      })
    ERR-TOKEN-NOT-FOUND
  )
)

;; Returns (some token-id) if the learner already has a certificate
;; for the given module, (none) otherwise.
(define-read-only (get-cert-for-module (recipient principal) (module-id uint))
  (map-get? cert-issued { recipient: recipient, module-id: module-id })
)
