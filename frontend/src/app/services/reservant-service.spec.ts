import { TestBed } from '@angular/core/testing';

import { ReservantService } from './reservant-service';

describe('ReservantService', () => {
  let service: ReservantService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReservantService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
