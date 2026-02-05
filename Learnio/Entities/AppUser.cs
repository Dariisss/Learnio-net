using Microsoft.AspNetCore.Identity;

namespace Learnio.Entities
{
    public class AppUser:IdentityUser
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string? AvatarUrl { get; set; } // Знак ? значит, что может быть пустым
    }
}
