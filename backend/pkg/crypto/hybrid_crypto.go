package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"io"
)

// GenerateRSAKeyPair 生成 RSA 密钥对
func GenerateRSAKeyPair() (*rsa.PrivateKey, *rsa.PublicKey, error) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, nil, err
	}
	return privateKey, &privateKey.PublicKey, nil
}

// ExportRSAPrivateKey 导出 RSA 私钥为 PEM 格式
func ExportRSAPrivateKey(privateKey *rsa.PrivateKey) string {
	privateKeyBytes := x509.MarshalPKCS1PrivateKey(privateKey)
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: privateKeyBytes,
	})
	return string(privateKeyPEM)
}

// ExportRSAPublicKey 导出 RSA 公钥为 PEM 格式
func ExportRSAPublicKey(publicKey *rsa.PublicKey) string {
	publicKeyBytes := x509.MarshalPKCS1PublicKey(publicKey)
	publicKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PUBLIC KEY",
		Bytes: publicKeyBytes,
	})
	return string(publicKeyPEM)
}

// ImportRSAPrivateKey 从 PEM 格式导入 RSA 私钥
func ImportRSAPrivateKey(privateKeyPEM string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return nil, errors.New("failed to parse PEM block containing the key")
	}
	return x509.ParsePKCS1PrivateKey(block.Bytes)
}

// ImportRSAPublicKey 从 PEM 格式导入 RSA 公钥
func ImportRSAPublicKey(publicKeyPEM string) (*rsa.PublicKey, error) {
	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		return nil, errors.New("failed to parse PEM block containing the key")
	}
	return x509.ParsePKCS1PublicKey(block.Bytes)
}

// HybridEncrypt 使用混合加密方式加密数据
func HybridEncrypt(data []byte, publicKey *rsa.PublicKey) ([]byte, error) {
	// 生成随机 AES 密钥
	aesKey := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, aesKey); err != nil {
		return nil, err
	}

	// 使用 AES 加密数据
	block, err := aes.NewCipher(aesKey)
	if err != nil {
		return nil, err
	}

	// 创建 GCM 模式
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	// 生成随机 nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	// 使用 AES-GCM 加密数据
	ciphertext := gcm.Seal(nonce, nonce, data, nil)

	// 使用 RSA 加密 AES 密钥
	encryptedKey, err := rsa.EncryptPKCS1v15(rand.Reader, publicKey, aesKey)
	if err != nil {
		return nil, err
	}

	// 组合加密后的 AES 密钥和加密后的数据
	result := append(encryptedKey, ciphertext...)
	return result, nil
}

// HybridDecrypt 使用混合加密方式解密数据
func HybridDecrypt(encryptedData []byte, privateKey *rsa.PrivateKey) ([]byte, error) {
	// 分离加密的 AES 密钥和加密的数据
	keySize := 256 // RSA 2048 位密钥加密后的长度
	if len(encryptedData) < keySize {
		return nil, errors.New("encrypted data too short")
	}

	encryptedKey := encryptedData[:keySize]
	ciphertext := encryptedData[keySize:]

	// 使用 RSA 解密 AES 密钥
	aesKey, err := rsa.DecryptPKCS1v15(rand.Reader, privateKey, encryptedKey)
	if err != nil {
		return nil, err
	}

	// 创建 AES cipher
	block, err := aes.NewCipher(aesKey)
	if err != nil {
		return nil, err
	}

	// 创建 GCM 模式
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	// 提取 nonce
	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("ciphertext too short")
	}

	nonce := ciphertext[:nonceSize]
	ciphertext = ciphertext[nonceSize:]

	// 使用 AES-GCM 解密数据
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
} 