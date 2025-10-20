;;; === LOADPOINTS.lsp ===
;;; Imports PNEZD survey points from text files in current drawing directory
;;; Automatically finds .txt files and imports points as AutoCAD POINT entities

(defun c:LOADPOINTS (/ dwg-path txt-files selected-file file-handle line parts point-num easting northing elev desc pt-count)
  
  (princ "\nLOADPOINTS - Import PNEZD survey points")
  
  ;; Get current drawing directory
  (setq dwg-path (getvar "DWGPREFIX"))
  (princ (strcat "\nSearching for text files in: " dwg-path))
  
  ;; Find all .txt files in drawing directory
  (setq txt-files (find-txt-files dwg-path))
  
  (if (not txt-files)
    (progn
      (princ "\nNo .txt files found in drawing directory.")
      (princ "\nMake sure your points file is in the same folder as the drawing.")
    )
    (progn
      ;; If only one file, use it automatically
      (if (= (length txt-files) 1)
        (progn
          (setq selected-file (car txt-files))
          (princ (strcat "\nFound points file: " selected-file))
        )
        (progn
          ;; Multiple files - let user choose
          (princ "\nMultiple text files found:")
          (setq i 1)
          (foreach file txt-files
            (princ (strcat "\n" (itoa i) ". " file))
            (setq i (+ i 1))
          )
          (setq choice (getint "\nEnter file number to import: "))
          (if (and choice (>= choice 1) (<= choice (length txt-files)))
            (setq selected-file (nth (- choice 1) txt-files))
            (progn
              (princ "\nInvalid selection.")
              (setq selected-file nil)
            )
          )
        )
      )
      
      ;; Import points from selected file
      (if selected-file
        (progn
          (princ (strcat "\nImporting points from: " selected-file))
          (setq pt-count (import-pnezd-points (strcat dwg-path selected-file)))
          (if (> pt-count 0)
            (progn
              (princ (strcat "\nSuccessfully imported " (itoa pt-count) " points."))
              (command "ZOOM" "EXTENTS")
              (princ "\nZoomed to show all points.")
            )
            (princ "\nNo valid points found in file.")
          )
        )
      )
    )
  )
  (princ)
)

;; Function to find all .txt files in a directory
(defun find-txt-files (dir-path / files file-list)
  (setq file-list '())
  
  ;; Use DOS DIR command to find .txt files
  (setq temp-file (strcat (getenv "TEMP") "\\txt_files.tmp"))
  (command "shell" (strcat "dir \"" dir-path "*.txt\" /b > \"" temp-file "\""))
  
  ;; Wait a moment for command to complete
  (command "delay" 500)
  
  ;; Read the results
  (if (findfile temp-file)
    (progn
      (setq file-handle (open temp-file "r"))
      (if file-handle
        (progn
          (while (setq line (read-line file-handle))
            (if (and line (/= line ""))
              (setq file-list (append file-list (list line)))
            )
          )
          (close file-handle)
        )
      )
      ;; Clean up temp file
      (vl-file-delete temp-file)
    )
  )
  
  file-list
)

;; Function to import PNEZD points from a file
(defun import-pnezd-points (file-path / file-handle line parts point-num easting northing elev desc pt-count valid-line)
  (setq pt-count 0)
  
  (if (setq file-handle (open file-path "r"))
    (progn
      (princ "\nReading points file...")
      
      (while (setq line (read-line file-handle))
        (if (and line (/= (vl-string-trim " \t" line) ""))
          (progn
            ;; Parse line - try different delimiters
            (setq parts (parse-point-line line))
            (setq valid-line nil)
            
            ;; Check if we have at least Point, Northing, Easting (minimum for a point)
            (if (and parts (>= (length parts) 3))
              (progn
                (setq point-num (nth 0 parts))
                (setq easting (atof (nth 1 parts)))
                (setq northing (atof (nth 2 parts)))
                (setq elev (if (>= (length parts) 4) (atof (nth 3 parts)) 0.0))
                (setq desc (if (>= (length parts) 5) (nth 4 parts) ""))
                
                ;; Validate coordinates (must be non-zero numbers)
                (if (and (/= easting 0.0) (/= northing 0.0))
                  (setq valid-line t)
                )
              )
            )
            
            ;; Create point if valid
            (if valid-line
              (progn
                (create-survey-point point-num easting northing elev desc)
                (setq pt-count (+ pt-count 1))
                
                ;; Progress indicator
                (if (= (rem pt-count 50) 0)
                  (princ (strcat "\nProcessed " (itoa pt-count) " points..."))
                )
              )
            )
          )
        )
      )
      
      (close file-handle)
      (princ (strcat "\nFinished processing file."))
    )
    (progn
      (princ (strcat "\nError: Could not open file " file-path))
    )
  )
  
  pt-count
)

;; Function to parse a point line with various delimiters
(defun parse-point-line (line / parts)
  ;; Try comma first, then space, then tab
  (setq parts (split-string-multi line ","))
  (if (< (length parts) 3)
    (setq parts (split-string-multi line " "))
  )
  (if (< (length parts) 3)
    (setq parts (split-string-multi line "\t"))
  )
  
  ;; Clean up parts (remove empty strings and trim whitespace)
  (setq parts (mapcar '(lambda (s) (vl-string-trim " \t" s)) parts))
  (setq parts (vl-remove "" parts))
  
  parts
)

;; Function to split string by delimiter (handles multiple consecutive delimiters)
(defun split-string-multi (str delimiter / result pos start current-part)
  (setq result '())
  (setq start 0)
  
  (while (< start (strlen str))
    (setq pos (vl-string-search delimiter str start))
    (if pos
      (progn
        (setq current-part (substr str (+ start 1) (- pos start)))
        (if (/= current-part "")
          (setq result (append result (list current-part)))
        )
        (setq start (+ pos 1))
      )
      (progn
        (setq current-part (substr str (+ start 1)))
        (if (/= current-part "")
          (setq result (append result (list current-part)))
        )
        (setq start (strlen str))
      )
    )
  )
  
  result
)

;; Function to create a survey point in AutoCAD
(defun create-survey-point (point-num easting northing elev desc / pt-obj)
  ;; Create POINT entity
  (command "POINT" (list easting northing elev))
  
  ;; Get the last created entity
  (setq pt-obj (entlast))
  
  ;; Add point number as text near the point
  (command "TEXT" 
           (list (+ easting 2.0) (+ northing 2.0) elev)  ; Offset text slightly
           "2.0"                                          ; Text height
           "0"                                            ; Rotation
           point-num                                      ; Point number
  )
  
  ;; Add description if provided
  (if (and desc (/= desc ""))
    (command "TEXT" 
             (list (+ easting 2.0) (- northing 2.0) elev)  ; Offset below point
             "1.5"                                          ; Smaller text height
             "0"                                            ; Rotation
             desc                                           ; Description
    )
  )
)

(princ "\nLOADPOINTS command loaded. Type LOADPOINTS to import survey points.")
(princ)